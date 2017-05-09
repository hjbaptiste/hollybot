/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var config = require('./configuration');
var holidays = require('./holidays');

var useEmulator = (process.env.NODE_ENV == 'development');
//Comment out this line below in azure
useEmulator = true;

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    //appId: b6f8a780-2381-4e03-a969-c4a977150272, 
    //appPassword: 9YiThDstkgvVuiXhNeJBRNj,
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    console.log("Server listening to default endpoint");
    module.exports = { default: connector.listen() }
}

// The format of the model_url:  
//   https://api.projectoxford.ai/luis/v2.0/apps/[model id goes here]?subscription-key=[key goes here]

//Initialize LUIS intent dialog
var model_urlh = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_MODEL_ID + "?subscription-key=" + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_KEY + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;
var model_urlv = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d7993093-7a05-43a9-8510-ab71e442e5c8?subscription-key=6e5c542c313242c38f8d5dd8e987e3d3&timezoneOffset=0&verbose=true&spellCheck=true&q=';
var model_urlm = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_NH_MODEL_ID + "?subscription-key=" + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_NH_API_KEY + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;

var recognizerv = new builder.LuisRecognizer(model_urlv);
var recognizerh = new builder.LuisRecognizer(model_urlh);
var recognizerm = new builder.LuisRecognizer(model_urlm);

var luisIntents = new builder.IntentDialog({ recognizers: [recognizerv, recognizerh, recognizerm] });

luisIntents.onDefault ([
    function (session) {
        // If neither Entity was returned then inform the user and call the 'help' dialog
        session.send("Sorry, I didn't understand.");
        session.beginDialog('/help');
    },
    function (session) {
        session.beginDialog('/process');
    }
]);

bot.dialog('/process', luisIntents);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

var LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer]})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
intents.matches(/^holly/i, 
    function (session) {
        session.send("Hi!, I\'m Holly the Holiday Bot.");

        // "Push" the help dialog onto the dialog stack
        session.beginDialog('/help');
    },
    function(session) {
         session.beginDialog('/process');
    }
);

/**
 * @Descripton: Informs the uer what functions that can be performed.
 */
bot.dialog('/help', function(session) {
        session.send("These are some things I can help you with.  You can say:\n\nNext holiday\n\nList of all holidays\n\nRemaining holidays\n\nWhen is Labor Day?");
        session.beginDialog('/process');
    }
);

/**
 * @Description: Returns the current date, year, month, day for the current day
 * @Return: Current Date
 */
var getTodaysDate = function (param) {
    // Create a new Date object representing today's date
    var today = new Date();
    if (param == "date") {
        // Return current date
        return today;
    } else if (param == "year") {
        // Return the current year
        return today.getFullYear();
    } else if (param == "month") {
        // Return the current month [0 - 11] with January being at index '0' and
        // December being at index '11'.
        return today.getMonth();
    } else if (param == "day") {
        // Return the current day of the month
        return today.getDate();
    }
};

/**
 * Function to return the String day of week. The built-in getDay() function returns a numeric value from 0-6
 */
function getDayOfWeekString(day) {
    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    return weekday[day]; 
}

var allUSHolidays = holidays.usholidays;

/**
 * @Description:Returns the a JSON object containing the list of remaining holidays and the number of
 * holidays that is left for the year.
 * @Return: JSON object
 */
var getWhenHoliday = function(param){
    var whenHoliday = "";
    console.log("Inside when holiday function:" + param);
        
    // Loop thru the all of the US Holidays
    for(var key in allUSHolidays) {
        // Get the Holiday at the current index in the loop
        var holiday = allUSHolidays[key];
        if ((holiday.name).toLowerCase() == param) {
            // Create a JSON object representing the Holiday
            whenHoliday = {"name": holiday.name , "date": holiday.date,
            "month": holiday.month, "day": holiday.day};
            break;
        }
    }
    return whenHoliday;
};


/**
 * @Description:Returns the a JSON object containing the list of remaining holidays and the number of
 * holidays that is left for the year.
 * @Return: JSON object
 */
var getRemainingHolidays = function(){
    var remainingHolidaysString = "";
    var numRemainingHolidays = 0;
    // Loop thru the all of the US Holidays
    for(var key in allUSHolidays) {
        // Get the Holiday at the current index in the loop
        var holiday = allUSHolidays[key];
        if (holiday.month > getTodaysDate("month") + 1 ||
        (holiday.month == getTodaysDate("month") + 1 && holiday.day > getTodaysDate("day"))) {
            // Append the new line character to the end of the string that contains the list 
            // of holidays that have been found and add the current one to it.
            remainingHolidaysString += "\n\n" + holiday.name;
            numRemainingHolidays++;
        }
    }
    // Create a JSON object representing the list of Holidays and the count
    var remainingHolidays = {"remainingHolidays": remainingHolidaysString, "countRemaining": numRemainingHolidays};
    return remainingHolidays;
};


/**
 * @Description: Triggered when user says something which matches the 'allHolidays'
 * intent.  It loops through the list of US Holidays in the holidays.json file and
 * send them to the current conversation.
 */
luisIntents.matches('allHolidays', [
    function (session, args) {
        var allHolidays = '';
        // Loop thru the all of the US Holidays
        for (var i in allUSHolidays) {
            // Append the new line character to the end of the string that contains the list 
            // of holidays that have been found and add the current one to it.
            allHolidays += '\n\n'+allUSHolidays[i].name;
        }
        // Send the entire list of Holidays to the conversation
        session.send("These are ALL US Holidays: %s.", allHolidays);
    },
    function (session) {
        session.beginDialog('/process');
    }
]);


/**
 * @Description: Triggered when user says something which matches the 'remainingHolidays'
 * intent.  The 'findEntity' built-in funtion is used to get the Entities returned by the Natural
 * Language Processor (LUIS).
 * 
 * It call the 'getRemainingHolidays' function to calculate what the remaining holidays are and how many
 * are left for the year.
 */
luisIntents.matches('remainingHolidays', [
    function(session, args) {
        // Get the list of Entities returned from LUIS
        var remainEntities = args.entities;
        
        // See if what the user said has the 'remain' and the 'count' Entities
        var remainEntity = builder.EntityRecognizer.findEntity(remainEntities, 'remain');
        var countEntity = builder.EntityRecognizer.findEntity(remainEntities, 'count');
        if (countEntity) {
            // If the 'count' Entity is returned then have Holly say how many Holidays are remaining
            session.send("The number of Holidays left is %s.", getRemainingHolidays().countRemaining);       
        } else if (remainEntity) {
            // If the 'remain' Entity is returned then have Holly say the Holidays that are remaining
            session.send("The remaining Holidays are:\n\n %s", getRemainingHolidays().remainingHolidays);
        }
        else {
            // If neither Entity was returned then inform the user and call the 'help' dialog
            session.send("Sorry, I didn't understand.");
            session.beginDialog('/help');
        }
    },
    function(session) {
        session.beginDialog('/process');
    }
]);

/**
 * Next holiday function 
 * Triggered when the user resembles a request with the next holiday intent
 */
luisIntents.matches('nextHoliday', [
    function(session, args) {
        //calculate the next holiday based on today's date
        var nextHoliday;
        var nextHolidayDate;
        var today = getTodaysDate("date");
        var holidayFound = false;

        for(var i = 0; i < allUSHolidays.length; ++i) {
            nextHolidayDate = new Date(today.getFullYear() + "-" + allUSHolidays[i].date);
            if(nextHolidayDate > today) {
                nextHoliday = allUSHolidays[i];
                holidayFound = true;
                break;
            }
        }

        if(holidayFound){
            session.send("The next holiday is " + nextHoliday.name + " on " + getDayOfWeekString(nextHolidayDate.getDay()) + ", " + nextHoliday.date);
        } else {
            //if no holiday is found, it means it's past or equal to the last day of the year and the next holiday will be the first one for next year
            nextHolidayDate = new Date((today.getFullYear() + 1) + "-" + allUSHolidays[0].date);
            session.send("The next holiday is " + allUSHolidays[0].name + " on " + getDayOfWeekString(nextHolidayDate.getDay()) + ", " + allUSHolidays[0].date);
         }
    },
    function(session) {
        session.beginDialog('/process');
    }
]);

/**
 * @Description: Triggered when user says something which matches the 'whenHoliday'
 * intent.
 * 
 * It call the 'getRemainingHolidays' function to calculate what the remaining holidays are and how many
 * are left for the year.
 */
luisIntents.matches('whenHoliday', [
    function(session, args) {
        // Get the list of Entities returned from LUIS
        var whenEntities = args.entities;   
        var isWhenEntity = false;
        var isHolidayEntity = false;
        var when = "";
        var holiday = "";
        for(var key in whenEntities) {
            // Get the Holiday at the current index in the loop
            var entity = whenEntities[key];
            // See if what the user said has the 'when' and the 'holiday' Entities
            if (entity.type == 'when') {
                isWhenEntity = true;
                when = entity.entity;
            } else if (entity.type == 'holiday') {
                isHolidayEntity = true;
                holiday = entity.entity;
            }
        }
        if (isWhenEntity && isHolidayEntity) {
            var whenHoliday = getWhenHoliday(holiday);
            var botResponse = "";
            var responseVar = "";
            if (when == "date" || when == "when") {
                responseVar = (whenHoliday.name, whenHoliday.date);
                botResponse = "%s is on %s";     
            } else if(when == "month") {
                responseVar = (whenHoliday.name, whenHoliday.month);
                botResponse = "%s is on %s";
            } else if(when == "day") {
                responseVar = (whenHoliday.name, whenHoliday.day);
                botResponse = "%s is on the %s";
            }
            session.send(botResponse % responseVar); 
        } else {
            // If neither Entity was returned then inform the user and call the 'help' dialog
            session.send("Sorry, I didn't understand.");
            session.beginDialog('/help');
        }
    },
    function(session) {
        session.beginDialog('/process');
    }
]);

/* Eperimenting with a hi trigger
bot.dialog('/hi', [
    function (session) {
        // end dialog with a cleared stack.  we may want to add an 'onInterrupted'
        // handler to this dialog to keep the state of the current
        // conversation by doing something with the dialog stack
        session.send("Hi there! You can say:");
        session.beginDialog('/help');
    },
    function(session) {
        session.beginDialog('/process');
    }
]).triggerAction({matches: /^hi|Hello|Hello/i});
*/

/**
 * @Description: This dialog is triggered when the user says 'bye'
 */
bot.dialog('/bye', function (session) {
    // end dialog with a cleared stack.  we may want to add an 'onInterrupted'
    // handler to this dialog to keep the state of the current
    // conversation by doing something with the dialog stack
    session.endDialog("Ok... See you later.");
}).triggerAction({matches: /^bye|Goodbye|Bye/i});
