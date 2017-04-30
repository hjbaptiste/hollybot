//=========================================================
// Bot for demonstrating Cognitive Services API calls
//   - menu dialogs based on:  https://github.com/Microsoft/BotBuilder/blob/master/Node/examples/basics-menus/app.js
//=========================================================

var restify = require('restify');
var builder = require('botbuilder');
var endOfLine = require('os').EOL;
var config = require('./configuration');
var holidays = require('./holidays'); // no need to add the .json extension

//=========================================================
// Bot Setup
//=========================================================

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

// The model_url of format:  
//   https://api.projectoxford.ai/luis/v2.0/apps/[model id goes here]?subscription-key=[key goes here]
//  Replace the "" with your model url
var model_url = config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_URL + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_MODEL_ID + "?subscription-key=" + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.LUIS_API_KEY + config.CONFIGURATIONS.LANGUAGE_UNDERSTANDING_SERVICE.URL_END_STRING;

var recognizer = new builder.LuisRecognizer(model_url);

//****************************************************************/
// Begin intent logic setup.  An intent is an action a user wants
// to perform.  They, in general, are grouped as expressions that mean
// the same thing, but may be constructed differently.  We can have as
// many as we like here.
var intents = new builder.IntentDialog();
var luisintents = new builder.IntentDialog({ recognizers: [recognizer] });

//=========================================================
// Bots Dialogs
//=========================================================

// Create bot and add intent logic (defined later on)
var bot = new builder.UniversalBot(connector);

bot.dialog('/', intents);

//============================================================
// Set up the intents
//============================================================

// Just-say-hi intent logic
intents.matches(/^holly|^Holly|^Holly/i, [
    function(session) {
        session.send("Hi!, I\'m Holly the Holiday Bot.\r\nThese are some things I can help you with.  You can say:");

        // "Push" the help dialog onto the dialog stack
        session.beginDialog('/help');
    },
    function(session) {
         session.beginDialog('/process');
    }
]);

// Default intent when what user typed is not matched
intents.onDefault(builder.DialogAction.send(""));

bot.dialog('/help', function(session) {
        session.send("Next holiday");
        session.send("List of all holidays");
        session.send("Remaining holidays");
        session.endDialog("When is Labor Day?");
        //session.endDialog("Go ahead, I\'m listening");
    }
);

bot.dialog('/process', luisintents);

var numofusholidaysleft = 0;
for(var exKey in holidays.usholidays) {
    numofusholidaysleft++;
 }
luisintents.matches('remainingHolidays', [
    function(session, args) {
        var remainintent = args.intent;
        var remainentities = args.entities;
        var remainentity = builder.EntityRecognizer.findEntity(remainentities, 'remain');
        var countentity = builder.EntityRecognizer.findEntity(remainentities, 'count');
        // These are some debug statements to test what is in the variables
        //session.send("args  = " + args);
        //session.send("intent  = " + remainintent);
        //session.send("args entities = " + remainentities);
       // session.send("countentity = " + countentity);
       // session.send("remainentity =" + remainentity);
        if (countentity || remainentity) {
             session.endDialog("The number of Holidays left is %s.", numofusholidaysleft);       
        } else {
            session.send("Sorry, I didn't understand. You can say:");
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

bot.dialog('/bye', function (session) {
    // end dialog with a cleared stack.  we may want to add an 'onInterrupted'
    // handler to this dialog to keep the state of the current
    // conversation by doing something with the dialog stack
    session.endDialog("Ok... See you later.");
}).triggerAction({matches: /^bye|Goodbye|Bye/i});
