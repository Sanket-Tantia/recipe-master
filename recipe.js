const {
    dialogflow,
    Suggestions,
    Permission,
    BasicCard,
    Button,
    Image,
    BrowseCarouselItem,
    BrowseCarousel
} = require('actions-on-google');

// Instantiate the Dialogflow client.
// https://recipe-master-assistant.herokuapp.com/dialogflow
const app = dialogflow({ debug: true });
const express = require('express')
const request = require("request");
const bodyParser = require('body-parser')

var recipe_search_http_implementation = function(query) {
    return new Promise((resolve, reject) => {
        var options = {
            method: 'GET',
            url: 'https://api.edamam.com/search',
            qs: {
                q: query,
                app_id: '105c9de2',
                app_key: 'ed97a2297018f1a0e6fce2f1a8ac42e2',
                from: '0',
                to: '6'
            }
        };

        request(options, function(error, response, body) {
            if (error) reject(error);
            body = JSON.parse(body);
            resolve(body.hits)
        });
    })
}

// Handle the Dialogflow intent named 'favorite color'.
// The intent collects a parameter named 'color'

app.intent('Default Welcome Intent', async function(conv) {
    // conv.ask(new Permission({
    //     context: 'Hello! Welcome to Recipe Master! To assist you',
    //     permissions: 'AGE'
    // }));
    conv.ask(`Hello! Welcome to Recipe Master! Tell me the dish name so that I can get you the recipes?`);
    conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
});

// app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
//     if (!permissionGranted) {
//         conv.ask(`Sorry, I cannot assist without the above permission. Please provide permission to go ahead or enter bye to exit.`);
//     } else {
//         conv.data.userName = conv.user.name.display;
//         conv.ask(`Thanks, ${conv.data.userName}. Tell me the dish name so that I can get you the recipes`);
//         conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
//     }
// });

app.intent('actions_intent_CANCEL', async function(conv) {
    conv.user.storage = {};
    conv.close(`I hope you liked my recipes. Looking forward to serve you again. Bye!`);
});

app.intent('getrecipe', async function(conv, { any }) {

    // if (!conv.screen) {
    //     conv.ask('Sorry, try this on a screen device or select the ' +
    //         'phone surface in the simulator.');
    //     conv.ask('Which response would you like to see next?');
    //     return;
    // }

    hits = await recipe_search_http_implementation(any);

    if (hits.length == 0) {
        conv.ask("Sorry I could not find any recipe. Please enter another dish name.")

    } else if (hits.length == 1) {
        singleRecipe = hits[0]
        if (singleRecipe.recipe.healthLabels.includes('Alcohol-Cocktail')) {
            conv.ask("Currently we do not serve requests which belong to Alcohol-cocktail category. Please try some other dish.")
            conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
        } else {
            conv.ask(`Here are your recipes.`);
            var filtered_health_labels = singleRecipe.recipe.healthLabels.filter(function(value, index, arr) {
                return value != 'Vegetarian';
            });
            conv.ask(new BasicCard({
                text: `Health Labels: ${filtered_health_labels.join(", ")}\nCalories: ${singleRecipe.recipe.calories}`, // Note the two spaces before '\n' required for
                // a line break to be rendered in the card.
                subtitle: `Source: ${singleRecipe.recipe.source}`,
                title: singleRecipe.recipe.label,
                buttons: new Button({
                    title: `Full recipe`,
                    url: singleRecipe.recipe.url,
                }),
                image: new Image({
                    url: singleRecipe.recipe.image,
                    alt: `Image for ${any}`,
                }),
                display: 'CROPPED',
            }));
            conv.ask('Which recipe would you like to see next? Enter bye to exit.');
            conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
        }

    } else {
        carouselItems = []
        var alcohol_cocktail_category = false;
        hits.forEach(eachRecipe => {
            if (eachRecipe.recipe.healthLabels.includes('Alcohol-Cocktail') && !alcohol_cocktail_category) {
                conv.ask("Currently we do not serve requests which belong to Alcohol-cocktail category. Please try some other dish.")
                conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
                alcohol_cocktail_category = true;
            }
        });
        if (!alcohol_cocktail_category) {
            conv.ask(`Here are your recipes.`);
            hits.forEach(eachRecipe => {
                var filtered_health_labels = eachRecipe.recipe.healthLabels.filter(function(value, index, arr) {
                    return value != 'Vegetarian';
                });
                carouselItems.push(new BrowseCarouselItem({
                    title: eachRecipe.recipe.label,
                    url: eachRecipe.recipe.url,
                    description: `Diet Labels: ${filtered_health_labels.join(", ")}\nCalories: ${eachRecipe.recipe.calories}`,
                    image: new Image({
                        url: eachRecipe.recipe.image,
                        alt: `Image for ${any}`,
                    }),
                    footer: `Source: ${eachRecipe.recipe.source}`,
                }))
            });
            conv.ask(new BrowseCarousel({
                items: carouselItems,
            }));
            conv.ask('Which recipe would you like to see next? Enter bye to exit');
            conv.ask(new Suggestions('Hakka noodles', 'Cheese cake', `Grilled chicken`, 'Sunny side up'));
        }
    }
});


const expressApp = express().use(bodyParser.json());

expressApp.get('/', (req, res) => res.send('online'));
expressApp.post('/dialogflow', app);

try {
    expressApp.listen(process.env.PORT || 5000)
} catch (error) {
    console.log(error)
}

console.log(`Listening on port ${process.env.PORT || 5000}`)