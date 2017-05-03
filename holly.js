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
var model_url = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_MODEL_ID + "?subscription-key=" + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_KEY + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;

var nh_model_url = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + "768aa6e1-11bc-4a1e-9d21-0609682b85bd" + "?subscription-key=" + "53de170d59764c95bdadf8ec27619f44" + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;

var recognizer = new builder.LuisRecognizer(model_url);
var nh_recognizer = new builder.LuisDialog(nh_model_url);

//****************************************************************/
// Begin intent logic setup.  An intent is an action a user wants
// to perform.  They, in general, are grouped as expressions that mean
// the same thing, but may be constructed differently.  We can have as
// many as we like here.
var textIntents = new builder.IntentDialog();
var luisIntents = new builder.IntentDialog({ recognizers: [recognizer, nh_recognizer] });

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
    function () {
        // If neither Entity was returned then inform the user and call the 'help' dialog
        session.send("Sorry, I didn't understand.");
        session.beginDialog('/help');
    },
    function () {
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
var getRemainingHolidays = function(){
    var remainingHolidaysString = "";
    var numRemainingHolidays = 0;
    // Loop thru the all of the US Holidays
    for(key in allUSHolidays) {
        // Get the Holiday at the current index in the loop
        var holiday = allUSHolidays[key];
        if (holiday.month > getTodaysDate("month") + 1 ||
        (holiday.month == getTodaysDate("month") + 1 && holiday.day > getTodaysDate("day"))) {
            // If this isn't the first holiday found then append the new line character to
            // the end of the string that contains the list of holidays that have been found
            // and add the current one to it.
            if (remainingHolidaysString != "") {
                remainingHolidaysString = remainingHolidaysString + "\n\n" + holiday.name;
            } else {
                remainingHolidaysString = holiday.name + "\n\n";
            }
            numRemainingHolidays++;
        }
    }
    // Create a JSON object representing the list of Holidays and the count
    var remainingHolidays = {"remainingHolidays": remainingHolidaysString, "countRemaining": numRemainingHolidays};
    return remainingHolidays;
};

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
            session.endDialog("The number of Holidays left is %s.", getRemainingHolidays().countRemaining);       
        } else if (remainEntity) {
            // If the 'remain' Entity is returned then have Holly say the Holidays that are remaining
            session.endDialog("The remaining Holidays are:\n\n %s", getRemainingHolidays().remainingHolidays);
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
        var today = new Date();
        var holidayFound = false;

        for(var i = 0; i < allUSHolidays.length; ++i) {
            nextHolidayDate = new Date(today.getFullYear() + "-" + allUSHolidays[i].date + " 00:00:00");
            if(nextHolidayDate > today) {
                nextHoliday = allUSHolidays[i];
                holidayFound = true;
                break;
            }
        }

        if(holidayFound){
            console.log("day of week:" + getDayOfWeekString(nextHolidayDate.getDay()));
            session.endDialog("The next holiday is " + nextHoliday.name + " on " + getDayOfWeekString(nextHolidayDate.getDay()) + ", " + nextHoliday.date);
        } else {
            nextHolidayDate = new Date((today.getFullYear() + 1) + "-" + allUSHolidays[0].date);
            //if no holiday is found, it means it's past or equal to the last day of the year and the next holiday will be the first one for next year
            session.endDialog("The next holiday is " + allUSHolidays[0].name + " on " + getDayOfWeekString(nextHolidayDate.getDay()) + ", " + allUSHolidays[0].date);
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
