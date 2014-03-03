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
// MLBScores module definition

App.module("MLBScores", function (Mod, App, Backbone, Marionette, $, _) {

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

    //----------------------------------
    // Utility functions

    Mod.Tools = {

        // Adds a zero to the given number, if needed
        NumberPad2: function (number) {
            number = Number(number);
            if (number < 10) {
                return "0" + String(number);
            }
            return String(number);
        },

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

        initialize: function () {
            this.fetch();
        },

        sync: function (method, model, options) {
            var now = (new Date()).getTime();
            var date_key = model.getDateKey();
            var league = model.get("League");
            if (model.get("LastModified")[date_key] == null
                || model.get(league)[date_key] == null
                || (date_key == model.getDateKey(now) && now - model.get("LastModified")[date_key] > 60000)) {
                $.ajax("mlb_json_proxy.php", {
                    async: false,
                    type: "GET",
                    dataType: "json",
                    data: { ws_path: "components/game/" + model.get("League") + "/year_" + model.get("GameDate").getFullYear() + "/month_" + Mod.Tools.NumberPad2(Number(model.get("GameDate").getMonth()) + 1) + "/day_" + Mod.Tools.NumberPad2(Number(model.get("GameDate").getDate())) + "/master_scoreboard.json" }
                }).done(function (data, textStatus, jqXHR) {
                    var data_set = { data: { games: { game: [] } } };
                    if (data != "GameDay - 404 Not Found") {
                        var data_set = $.parseJSON(data);
                        if (!_.isArray(data_set.data.games.game)) {
                            data_set.data.games.game = (data_set.data.games.game != null ? [data_set.data.games.game] : []);
                        }
                    }
                    var data_update = { LastModified: model.get("LastModified") };
                    data_update.LastModified[date_key] = now;
                    data_update[league] = _.extend({}, model.get(league));
                    data_update[league][date_key] = data_set;
                    data_update.copyright = data_set.copyright;
                    data_update.data = data_update[league][date_key].data;
                    model.set(data_update, options);
                }).fail(function (jqXHR, textStatus) {
                    alert("Request failed: " + jqXHR.responseText);
                });
            } else {
                model.set("data", model.attributes[league][date_key].data, options);
            }
        },

        getDateKey: function (date) {
            date = (_.isNumber(date) ? new Date(date) : this.get("GameDate"));
            return date.getFullYear() + Mod.Tools.NumberPad2(Number(date.getMonth()) + 1) + Mod.Tools.NumberPad2(Number(date.getDate()));
        }
    });

    Mod.Header = Marionette.ItemView.extend({
        template: "#mlb-scores-header",

        templateHelpers: {
            getDisplayGameDate: function () {
                return Mod.Tools.GetDisplayDate(this.GameDate);
            }
        },

        events: {
            "changed #mlb-scores-select-league": "selectLeague"
        },

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

        onRender: function () {
            var _this = this;
            this.ui.datepicker.datepicker({
                defaultDate: App.Prop.get("GameDate"),
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
            this.ui.previous.button({
                icons: {
                    primary: "ui-icon-circle-triangle-w",
                    text: false
                }
            }).click(function (ev) {
                _this.ui.datepicker.datepicker("setDate", new Date(_this.model.get("GameDate").getTime() - App.Constants.DayInMS));
                _this.selectGameDate(_this.ui.datepicker.datepicker("getDate").toDateString());
            });
            this.ui.next.button({
                icons: {
                    primary: "ui-icon-circle-triangle-e",
                    text: false
                }
            }).click(function (ev) {
                _this.ui.datepicker.datepicker("setDate", new Date(_this.model.get("GameDate").getTime() + App.Constants.DayInMS));
                _this.selectGameDate(_this.ui.datepicker.datepicker("getDate").toDateString());
            });
            this.ui.leagueselect.change(function (ev) {
                _this.selectLeague();
            });
            this.ui.list.click(function (ev) {
                App.vent.trigger("changed:viewtype", "list");
            });
            this.ui.grid.click(function (ev) {
                App.vent.trigger("changed:viewtype", "grid");
            });
            this.ui.viewbuttons.buttonset();
        },

        selectLeague: function () {
            this.model.set("League", this.$("#mlb-scores-select-league option").filter(":selected").val(), { silent: true });
            this.selectGameDate((this.model.has("GameDate") ? this.model.get("GameDate") : App.Prop.get("GameDate")).toDateString());
        },

        selectGameDate: function (dateText, inst) {
            this.model.set("GameDate", new Date(Date.parse(dateText)), { silent: true });
            this.ui.datepicker.datepicker("option", "buttonText", Mod.Tools.GetDisplayDate(this.model.get("GameDate")));
            App.vent.trigger("changed:gamedate", this.model.get("League"), this.model.get("GameDate"));
        }
    });

    Mod.Footer = Marionette.ItemView.extend({
        template: "#mlb-scores-footer"
    });

    Mod.Content = Marionette.ItemView.extend({
        template: "#mlb-scores-full-game-view",

        templateHelpers: {
            getDisplayGameDate: function () {
                return Mod.Tools.GetDisplayDate(this.GameDate);
            },
            getGameTypeDescription: function (gameList) {
                if (gameList.length > 0) {
                    return Mod.Tools.GetGameTypeDescription(gameList[0].game_type);
                }
                return "No game scores are available for this date.";
            },
            getTeamName: function (gameData, type) {
                if (type == "away") {
                    return "".concat(gameData.away_team_city, " ", (gameData.away_team_city.indexOf(gameData.away_team_name) < 0 ? gameData.away_team_name : ""));
                } else {
                    return "".concat(gameData.home_team_city, " ", (gameData.home_team_city.indexOf(gameData.home_team_name) < 0 ? gameData.home_team_name : ""));
                }
            },
            getInningClasses: function (gameData, isTop, inning, inningIndex) {
                var result = "";
                if ((!isTop && Number(inning.home) > 0)
                    || (isTop && Number(inning.away) > 0)) {
                    result += " boxRuns";
                }
                if (gameData.linescore.inning.length == inningIndex + 1
                    && (isTop && gameData.status.top_inning == 'Y'
                        || !isTop && gameData.status.top_inning == 'N')) {
                    result += " currentInning";
                }
                return String(result);
            }
        },

        ui: {
            boxscores: ".boxScores"
        },

        initialize: function () {
            var _this = this;
            App.vent.on("changed:gamedate", function (league, gameDate) {
                _this.model.set({
                    League: league,
                    GameDate: gameDate
                }, { silent: true });
                _this.model.fetch();
                _this.render();
            });
        }
    });

    Mod.ContentList = Mod.Content.extend({
        template: "#mlb-scores-full-game-view",

        onRender: function () {
            this.ui.boxscores.sortable({
                items: ".boxScoreList"
            });
        }
    });

    Mod.ContentGrid = Mod.Content.extend({
        template: "#mlb-scores-summary-game-view",

        onRender: function () {
            this.ui.boxscores.sortable({
                items: ".boxScoreGrid"
            });
        }
    });

    //----------------------------------
    // End of External functions
    //----------------------------------

});

// End of MLBScores module
//----------------------------------
