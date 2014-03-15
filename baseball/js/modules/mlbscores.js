/*!
 * MLBScores Marionette Module
 * mlbscores.js
 * http://baycg.com/
 *
 * Copyright 2014, Brett Grimes
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: 09-Feb-2014
 */

//----------------------------------
// Base.MLBScores module definition
//----------------------------------

App.module("MLBScores", function (Mod, App, Backbone, Marionette, $, _) {
    // Define the Module constants
    Mod.Constants = {
        MonthName: {
            0: "January",
            1: "February",
            2: "March",
            3: "April",
            4: "May",
            5: "June",
            6: "July",
            7: "August",
            8: "September",
            9: "October",
            10: "November",
            11: "December"
        }
    };

    // Base.MLBSCores.Utility functions
    //----------------------------------

    Mod.Tools = {

        // Returns a number as a string, padding single digit numbers with a leading zero
        NumberPad2: function (number) {
            number = Number(number);
            if (number < 10) {
                return "0" + String(number);
            }
            return String(number);
        },

        // Returns a Date as a string in format of "MMM d, yyyy"
        GetDisplayDate: function (date) {
            return Mod.Constants.MonthName[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
        },

        // Returns a string description for the given game type code
        GetGameTypeDescription: function (gameType) {
            switch (gameType) {
                case "E":
                case "S":
                    return "Pre-Season";
                    break;
                case "R":
                    return "Regular Season";
                    break;
                case "A":
                    return "All-Star Game";
                    break;
                case "D":
                    return "Divisional Series";
                    break;
                case "L":
                    return "League Championship Series";
                    break;
                case "W":
                    return "World Series";
                    break;
                default:
                    return "";
                    break;
            }
        }
    }

    // End of Utility methods


    // Data objects
    //----------------------------------

    // Base.MLBScores.Model definition
    //----------------------------------
    Mod.Model = Backbone.Model.extend({
        defaults: {
            async: false,
            urlRoot: "",
            LastModified: {},
            mlb: {},
            aaa: {},
            nat: {},
            aax: {},
            afa: {},
            afx: {},
            asx: {}
        },

        // Initialization of the model
        initialize: function () {
            // Fetch data from the server
            this.fetch();
        },

        // Override the sync function to process the data returned from the PHP proxy
        sync: function (method, model, options) {
            var now = (new Date()).getTime();
            var date_key = model.getDateKey();
            var league = model.get("League");
            // Make an AJAX call for the data if it is the first time or it has been longer than the refesh timeout period
            if (model.get("LastModified")[date_key] == null
                || model.get(league)[date_key] == null
                || (date_key == model.getDateKey(now) && now - model.get("LastModified")[date_key] >= App.Constants.RefreshTimeoutLimitMS)) {
                $.ajax("mlb_json_proxy.php", {
                    async: false,
                    cache: false,
                    type: "GET",
                    dataType: "json",
                    data: { ws_path: "components/game/" + model.get("League") + "/year_" + model.get("GameDate").getFullYear() + "/month_" + Mod.Tools.NumberPad2(Number(model.get("GameDate").getMonth()) + 1) + "/day_" + Mod.Tools.NumberPad2(Number(model.get("GameDate").getDate())) + "/master_scoreboard.json" }
                }).done(function (data, textStatus, jqXHR) {
                    // CReate an empty data set
                    var data_set = { data: { games: { game: [] } } };
                    // If valid data was returned, parse it and update the data set with the result
                    if (_.isString(data) && data[0] == "{") {
                        data_set = $.parseJSON(data);
                        if (!_.isArray(data_set.data.games.game)) {
                            data_set.data.games.game = (data_set.data.games.game != null ? [data_set.data.games.game] : []);
                        }
                    }
                    // Update the model data from the data set
                    var data_update = { LastModified: Number(model.get("LastModified")) };
                    data_update.LastModified[date_key] = now;
                    data_update[league] = $.extend(true, {}, model.get(league));
                    data_update[league][date_key] = data_set;
                    data_update.copyright = data_set.copyright;
                    data_update.data = data_update[league][date_key].data;
                    model.set(data_update, options);
                }).fail(function (jqXHR, textStatus) {
                    // Let the user know the data fetch failed
                    alert("Request failed: " + jqXHR.responseText);
                });
            }
        },

        // Return a string key value constructed from the given date or the current GameDate by default
        getDateKey: function (date) {
            date = (_.isNumber(date) ? new Date(date) : this.get("GameDate"));
            return date.getFullYear() + Mod.Tools.NumberPad2(Number(date.getMonth()) + 1) + Mod.Tools.NumberPad2(Number(date.getDate()));
        }
    });

    // Base.MLBScores.Collection definition
    //----------------------------------
    Mod.Collection = Backbone.Collection.extend({
        // Default sort is by game time
        comparator: this.sortByTime,

        // Sort by status (primary), league (secondary) and home team city (tertiary)
        sortByStatus: function (itemA, itemB) {
            var result = itemA.get("status").status.localeCompare(itemB.get("status").status);
            if (result == 0) {
                result = itemA.get("league").localeCompare(itemB.get("league"));
            }
            if (result == 0) {
                result = itemA.get("home_team_city").localeCompare(itemB.get("home_team_city"));
            }
            return result;
        },

        // Sort by time (primary) and home team city (secondary)
        sortByTime: function (itemA, itemB) {
            var result = itemA.get("time").localeCompare(itemB.get("time"));
            if (result == 0) {
                result = itemA.get("home_team_city").localeCompare(itemB.get("home_team_city"));
            }
            return result;
        }
    });

    // End of Data objects

    // View definitions
    //----------------------------------

    // Base.MLBScores.Header definition
    //----------------------------------
    Mod.Header = Marionette.ItemView.extend({
        // The view template id
        template: "#mlb-scores-header",

        templateHelpers: {
            // Wrapper for the template to access the Base.MLBScores.Tools.GetDisplayDate function 
            getDisplayGameDate: function () {
                return Mod.Tools.GetDisplayDate(this.GameDate);
            }
        },

        // Events hash
        events: {
            "changed #mlb-scores-select-league": "selectLeague"
        },

        // UI hash
        ui: {
            previous: ".mlb-scores-datepicker-previous",
            next: ".mlb-scores-datepicker-next",
            date: ".mlb-scores-datepicker-date",
            datepicker: ".mlb-scores-datepicker-input",
            datebuttons: ".mlb-scores-date-buttonset",
            list: "#mlb-scores-list-button",
            grid: "#mlb-scores-grid-button",
            viewbuttons: "#mlb-scores-view-buttonset",
            leagueselect: "#mlb-scores-select-league"
        },

        // Post-render view work
        onRender: function () {
            var _this = this;
            // Create the date picker
            this.ui.datepicker.datepicker({
                defaultDate: this.model.get("GameDate"),
                dateFormat: "MM d, yy",
                gotoCurrent: true,
                minDate: new Date(2007, 0, 1),  // No json data for years before 2007
                maxDate: new Date(),
                changeMonth: true,
                changeYear: true,
                showOn: "focus",
                onSelect: function (dateText, inst) {
                    _this.selectGameDate(dateText, inst);
                }
            }).addClass("ui-button ui-button-text");

            // Create the Previous Date icon button and its click event handler
            this.ui.previous.button({
                icons: {
                    primary: "ui-icon-circle-triangle-w",
                    text: false
                }
            }).click(function (ev) {
                _this.ui.datepicker.datepicker("setDate", new Date(_this.model.get("GameDate").getTime() - App.Constants.DayInMS));
                _this.selectGameDate(_this.ui.datepicker.datepicker("getDate").toDateString());
            });

            // Create the Next Date icon button and its click event handler
            this.ui.next.button({
                icons: {
                    primary: "ui-icon-circle-triangle-e",
                    text: false
                }
            }).click(function (ev) {
                _this.ui.datepicker.datepicker("setDate", new Date(_this.model.get("GameDate").getTime() + App.Constants.DayInMS));
                _this.selectGameDate(_this.ui.datepicker.datepicker("getDate").toDateString());
            });

            // Add the League select event handler
            this.ui.leagueselect.change(function (ev) {
                _this.selectLeague();
            });

            // Add the List (Full) view button click event handler
            this.ui.list.click(function (ev) {
                App.vent.trigger("changed:viewtype", "list");
            });

            // Add the Grid (Summary) view button click event handler
            this.ui.grid.click(function (ev) {
                App.vent.trigger("changed:viewtype", "grid");
            });
            // Format the view buttons into a buttonset
            this.ui.viewbuttons.buttonset();
        },

        // Select League event handler definition
        selectLeague: function () {
            this.model.set("League", this.$("#mlb-scores-select-league option").filter(":selected").val(), { silent: true });
            this.selectGameDate((this.model.has("GameDate") ? this.model.get("GameDate") : new Date()).toDateString());
        },

        // Select Game Date event handler definition
        selectGameDate: function (dateText, inst) {
            this.model.set("GameDate", new Date(Date.parse(dateText)), { silent: true });
            this.ui.datepicker.datepicker("option", "buttonText", Mod.Tools.GetDisplayDate(this.model.get("GameDate")));
            App.vent.trigger("changed:gamedate", this.model.get("League"), this.model.get("GameDate"));
        }
    });

    // Base.MLBScores.Footer definition
    //----------------------------------
    Mod.Footer = Marionette.ItemView.extend({
        // The view template id
        template: "#mlb-scores-footer",

        // UI hash
        ui: {
            copyright: "mlb-scores-copyright",
            resultstime: "#mlb-scores-results-time"
        },

        // Post-render view work
        onRender: function () {
            // Add a refresh time update event handler
            App.vent.on("update:data", function (updateDate) {
                this.ui.resultstime.html(_.isDate(updateDate) ? updateDate.toLocaleTimeString() : "");
            }, this);
        }
    });

    // Base.MLBScores.EmptyView definition
    //----------------------------------
    Mod.EmptyView = Marionette.ItemView.extend({
        // The view template id
        template: "#mlb-scores-games-empty-view"
    });

    // Base.MLBScores.BaseView definition
    //----------------------------------
    Mod.BaseView = Marionette.ItemView.extend({
        templateHelpers: {
            // Wrapper for the template to access the Base.MLBScores.Tools.GetDisplayDate function 
            getDisplayGameDate: function () {
                return Mod.Tools.GetDisplayDate(this.GameDate);
            },
            // Return a string with the concatenated Team City and Name
            getTeamName: function (type) {
                if (type == "away") {
                    return "".concat(this.away_team_city, " ", (this.away_team_city.indexOf(this.away_team_name) < 0 ? this.away_team_name : ""));
                } else {
                    return "".concat(this.home_team_city, " ", (this.home_team_city.indexOf(this.home_team_name) < 0 ? this.home_team_name : ""));
                }
            }
        },

        // Define the model definition to be used by this view
        model: Backbone.Model
    });


    // Base.MLBScores.FullItem definition
    //----------------------------------
    Mod.FullItem = Mod.BaseView.extend({
        // The view template id
        template: "#mlb-scores-full-game-item-view",

        // Define the CSS class attribute for the main view element
        className: "boxScoreList"
    });

    // Base.MLBScores.SummaryItem definition
    //----------------------------------
    Mod.SummaryItem = Mod.BaseView.extend({
        // The view template id
        template: "#mlb-scores-summary-game-item-view",

        // Define the CSS class attribute for the main view element
        className: "boxScoreGrid"
    });

    // Base.MLBScores.Content definition
    //----------------------------------
    Mod.Content = Marionette.CompositeView.extend({
        // The view template id
        template: "#mlb-scores-games-view",

        templateHelpers: {
            // Wrapper for the template to access the Base.MLBScores.Tools.GetGameTypeDescription function 
            getGameTypeDescription: function (gameList) {
                if (gameList.length > 0) {
                    return Mod.Tools.GetGameTypeDescription(gameList[0].game_type);
                }
                return "No game scores are available for this date.";
            }
        },

        // Empty view definition
        emptyView: Mod.EmptyView,

        // Template target for the CollectionView
        itemViewContainer: ".boxScores",

        // UI hash
        ui: {
            boxscores: ".boxScores",
            alerts: ".mlb-scores-alerts"
        },

        // Initialization for the view
        initialize: function () {
            // Create the collection from the games list in the model data
            this.collection = new Mod.Collection(this.model.get("data").games.game);
            var _this = this;
            // Add an Application event handler for the "changed:gamedate" event
            App.vent.on("changed:gamedate", function (league, gameDate) {
                // Update the league and game date
                _this.model.set({
                    League: league,
                    GameDate: gameDate
                }, { silent: true });
                // Fetch the data from the server
                _this.model.fetch();
                // Apply the new data to the Collection
                _this.collection.set(_this.model.get("data").games.game);
                // Restart the auto-refresh functionality
                _this.setDataUpdate();
            });
            // Trigger a "update:data" event
            App.vent.trigger("update:data", new Date());
            // Start the auto-refresh functionality
            this.setDataUpdate();
        },

        // Set an auto-refresh feature, if showing games for the current date
        setDataUpdate: function () {
            var now = new Date();
            //Only start if viewing game data for today
            if (this.model.get("GameDate").toDateString() == now.toDateString()) {
                var _this = this;
                // Clear any existing interval function
                window.clearInterval(Mod.IntervalID);
                // Set an interval event handler to periodically fetch new data from the server
                Mod.IntervalID = window.setInterval(function () {
                    // Fetch the data from the server
                    _this.model.fetch();
                    // Apply the new data to the Collection
                    _this.collection.set(_this.model.get("data").games.game);
                    // Trigger a "update:data" event
                    App.vent.trigger("update:data", new Date());
                }, App.Constants.RefreshTimeoutLimitMS);
            } else {
                // Clear any existing interval function
                window.clearInterval(Mod.IntervalID);
                // Trigger a "update:data" event
                App.vent.trigger("update:data", null);
            }
        }
    });

    // Base.MLBScores.ContentList definition
    //----------------------------------
    Mod.ContentList = Mod.Content.extend({
        // Define the item view type
        itemView: Mod.FullItem,

        // Post-render view work
        onRender: function () {
            // Make the box score items sortable
            this.ui.boxscores.sortable({
                items: ".boxScoreList",
                opacity: 0.5
            });
        }
    });

    // Base.MLBScores.ContentGrid definition
    //----------------------------------
    Mod.ContentGrid = Mod.Content.extend({
        // Define the item view type
        itemView: Mod.SummaryItem,

        // Post-render view work
        onRender: function () {
            // Make the box score items sortable
            this.ui.boxscores.sortable({
                items: ".boxScoreGrid",
                opacity: 0.5
            });
        }
    });

    // End of Views

});

// End of MLBScores module
//----------------------------------
