var _config = {
    CHAT_CONNECTOR: {
        APP_ID: process.env.MICROSOFT_APP_ID || "", //You can obtain an APP ID and PASSWORD here: https://dev.botframework.com/bots/new
        APP_PASSWORD: process.env.MICROSOFT_APP_PASSWORD || ""
    },
    COMPUTER_VISION_SERVICE: {
        API_URL: "https://api.projectoxford.ai/vision/v1.0/",
        API_KEY: "key-goes-here"  //You can obtain an COGNITIVE SERVICE API KEY: https://www.microsoft.com/cognitive-services/en-us/pricing
    },
    LANGUAGE_UNDERSTANDING_SERVICE: {
        LUIS_API_URL: "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/",
        LUIS_MODEL_ID: "4fdec766-2837-4b5f-be29-783b772f7e7d",
        LUIS_API_KEY: "3c13ba4ca22e42fcb7c1b8a836e05034"
    }
};
exports.CONFIGURATIONS = _config;
