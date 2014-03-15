/*!
 * App and Base Marionette Module
 * base.js
 * http://baycg.com/
 *
 * Copyright 2014, Brett Grimes
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: 09-Feb-2014
 */

// Create the application instance
App = new Backbone.Marionette.Application();

// Define the Application initialization function
App.addInitializer(function (options) {
    // Define the constants for the application
    App.Constants = {
        DayInMS: 86400000,
        GameDate: new Date(),
        NumberOfMonthsToShow: 3,
        Title: "Major League Baseball Box Scores",
        Teams: {    // This will be filled during the data fetch
            AL: {}, // (Key, Value) => (TeamAbbr, TeamName)
            NL: {}  // (Key, Value) => (TeamAbbr, TeamName)
        },
        Leagues: {
            "mlb": "MLB",
            "aaa": "MILB AAA",
            "nat": "National Team",
            "aax": "MILB AA - Eastern League",
            "afa": "MILB High A - Florida State League",
            "afx": "MILB Low A - Midwest League",
            "asx": "MILB Short A - NY/PA League"
        },
        RefreshTimeoutLimitMS: 5000
    };

    // Add the display region
    App.addRegions({
        main: "#lCenter"
    });

    // Start the base module
    var base = App.module("Base");
    base.start();
});


// Definition for the Base module
// Contains the Controller, Model and Layout for the page
App.module("Base", function (Mod, App, Backbone, Marionette, $, _) {

    // Base.Controller definition
    Mod.Controller = Marionette.Controller.extend({
        // Initialization for the Base.Controller
        initialize: function () {
            // Create an instance of the Base.Layout for the page
            this.scoresLayout = new Mod.Layout({
                model: new Mod.Model()
            });
            // Show the layout in the Application display region
            App.main.show(this.scoresLayout);
        }
    });

    // Intialization for the Module
    Mod.addInitializer(function (options) {
        // Create an instance of the Base.Controller
        Mod.controller = new Mod.Controller();
    });

    // Base.Model definition
    Mod.Model = Backbone.Model.extend({
        defaults: {
            GameDate: new Date(),
            copyright: "",
            League: "mlb"
        }
    });

    // Base.Layout definition
    Mod.Layout = Marionette.Layout.extend({
        // The layout template id
        template: "#mlb-scores-layout",

        // Define the attributes on the main element
        attributes: {
            style: "margin:20px;"
        },

        // Define a header, content and footer region in the Base.Layout
        regions: {
            header: "#mlb-scores-layout-header",
            content: "#mlb-scores-layout-content",
            footer: "#mlb-scores-layout-footer"
        },

        // Initialization of the Base.Layout
        initialize: function () {
            // Create an instance of the MLBScores Module and start it
            this.gamesModule = App.module("MLBScores");
            this.gamesModule.start();

            // Set an event handler for view type changes
            App.vent.on("changed:viewtype", function (viewType) {
                viewType = viewType || this.currentViewType;
                // Swap the content views based on the given view type using the existing model data
                switch (viewType) {
                    default:
                    case "list":
                        this.content.show(new App.MLBScores.ContentList({
                            model: this.content.currentView.model
                        }));
                        break;
                    case "grid":
                        this.content.show(new App.MLBScores.ContentGrid({
                            model: this.content.currentView.model
                        }));
                        break;
                }
                // Update the cache of the current view type
                this.currentViewType = viewType;
            }, this);
        },

        // Show the page content in the Base.Layout
        onRender: function () {
            // Adjust the display height
            this.$el.height($(window).height() - 45);  // TODO: this needs adjusting for browsers on iOS

            // Create and show a new instance of the MLBScores.Header view 
            this.header.show(new App.MLBScores.Header({
                model: new App.Base.Model()
            }));

            // Create and show a new instance of the MLBScores.Footer view 
            this.footer.show(new App.MLBScores.Footer({
                model: new App.Base.Model()
            }));

            // Cache the current content view type
            this.currentViewType = "list";

            // Create and show a new instance of the MLBScores.ContentList view
            this.content.show(new App.MLBScores.ContentList({
                model: new App.MLBScores.Model({
                    GameDate: new Date(App.Constants.GameDate.getTime()),
                    copyright: "",
                    League: "mlb"
                })
            }));
        }
    });
});