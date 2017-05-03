//=========================================================
// Bot for demonstrating Cognitive Services API calls
//   - menu dialogs based on:  https://github.com/Microsoft/BotBuilder/blob/master/Node/examples/basics-menus/app.js
//=========================================================

var restify = require('restify');
var builder = require('botbuilder');
var endOfLine = require('os').EOL;
var config = require('./configuration');
var holidays = require('./holidays'); // no need to add the .json extension

/******** FOR USE WITH BOT EMULATOR AND/OR FOR DEPLOYMENT *********
*/

// Get secrets from server environment or settings in local file
var botConnectorOptions = { 
    appId: config.CONFIGURATIONS.CHAT_CONNECTOR.APP_ID, 
    appPassword: config.CONFIGURATIONS.CHAT_CONNECTOR.APP_PASSWORD
};

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);

// Setup Restify Server
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', connector.listen());

// Serve a static web page - for testing deployment
server.get(/.*/, restify.serveStatic({
	'directory': '.',
	'default': 'index.html'
}));

// Listen on a standard port (this will be the port for local emulator and cloud)
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});

// The format of the model_url:  
//   https://api.projectoxford.ai/luis/v2.0/apps/[model id goes here]?subscription-key=[key goes here]
var model_urlh = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_MODEL_ID + "?subscription-key=" + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_KEY + 
                config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;
var model_urlv = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d7993093-7a05-43a9-8510-ab71e442e5c8?subscription-key=6e5c542c313242c38f8d5dd8e987e3d3&timezoneOffset=0&verbose=true&spellCheck=true&q=';
var recognizerv = new builder.LuisRecognizer(model_urlv);
var recognizerh = new builder.LuisRecognizer(model_urlh);

//****************************************************************/
// Begin intent logic setup.  An intent is an action a user wants
// to perform.  They, in general, are grouped as expressions that mean
// the same thing, but may be constructed differently.  We can have as
// many as we like here.
var textIntents = new builder.IntentDialog();
//var luisIntents = new builder.IntentDialog({ recognizers: [recognizerv, recognizerh] });
var luisIntents = new builder.IntentDialog({ recognizers: [recognizerh] });

// Create bot and add intent logic (defined later on)
var bot = new builder.UniversalBot(connector);

// Maps the 'root' dialog to the test intents.
bot.dialog('/', textIntents);

// Maps the 'process' dialog to the LUIS intents.
bot.dialog('/process', luisIntents);

/**
 * @Description: Wakes up Holly bot only if user says 'holly' prior to saying anything else
 */
textIntents.matches(/^holly|^Holly|^Holly/i, [
    function(session) {
        session.send("Hi!, I\'m Holly the Holiday Bot.");

        // "Push" the help dialog onto the dialog stack
        session.beginDialog('/help');
    },
    function(session) {
         session.beginDialog('/process');
    }
]);

/**
 * Default text intent when what user said to wake up Holly bot is not matched
 */ 
textIntents.onDefault(builder.DialogAction.send(""));

/**
 * @Description: Default LUIS intent when the funtionality the user wants to use doesn't
 * match any of the intents created within the LUIS model.
 */
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

/**
 * @Descripton: Informs the uer what functions that can be performed.
 */
bot.dialog('/help', function(session) {
        session.endDialog("These are some things I can help you with.  You can say:\n\nNext holiday\n\nList of all holidays\n\nRemaining holidays\n\nWhen is Labor Day?");
        //session.endDialog("Go ahead, I\'m listening");
    }
);

/**
 * @Description: Returns the current date, year, month, day for the current day
 * @Return: Current Date
 */
var getTodaysDate = function (param) {
    // Create a new Date object representing today's date
    let today = new Date();
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

var allUSHolidays = holidays.usholidays;

/**
 * @Description:Returns the a JSON object containing the list of remaining holidays and the number of
 * holidays that is left for the year.
 * @Return: JSON object
 */
var getWhenHoliday = function(param){
    var whenHoliday = "";
    // Loop thru the all of the US Holidays
    for(key in allUSHolidays) {
        // Get the Holiday at the current index in the loop
        var holiday = allUSHolidays[key];
        if ((holiday.name).toLowerCase() === param) {
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
    for(key in allUSHolidays) {
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
        for(key in whenEntities) {
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
