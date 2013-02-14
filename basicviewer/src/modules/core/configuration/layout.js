/**
 This class is run at startup and handles the layout and creation of non-map elements in the page.
 */
define(["dojo/_base/declare", "../utilities/environment", "dojo/_base/lang", "dojo/Evented", "dijit/registry", "require"],
    function(declare, environment, lang, Evented, registry, require){
        return declare([Evented],
            {
                _AppConfig: null
                , _WebMap: null
                , _Map: null

                //Layout the regions of the Dojo container based on app configs.
                //This way the map can be sized properly when first created.
                , InitialLayout: function (appConfig) {
                    this._AppConfig = appConfig;
                    //load the specified theme
                    var ss = document.createElement("link");
                    ss.type = "text/css";
                    ss.rel = "stylesheet";
                    ss.href = "src/css/" + this._AppConfig.theme + ".css";
                    document.getElementsByTagName("head")[0].appendChild(ss);

                    //If app is embedded, do not show the header, footer, title, title logo, and hyperlinks
                    if (!this._AppConfig.embed) {
                        //add a title and logo, if applicable; automatically sets the height of the header depending on content and padding/margins
                        if (this._AppConfig.displaytitle === "true" || this._AppConfig.displaytitle === true) {
                            this._AppConfig.title = this._AppConfig.title || this._WebMap.item.title;
                            //Add a logo to the header if set
                            var logoImgHtml = '<img id="titleLogo" src="' +  this._AppConfig.titleLogoUrl + '" alt="MD Logo" />';
                            dojo.create("div", {
                                id: 'webmapTitle',
                                innerHTML: logoImgHtml + "<div class='titleDiv'>" + this._AppConfig.title + "</div>"
                            }, "header");
                        }
                        esri.show(dojo.byId('header'));
                        esri.show(dojo.byId('bottomPane'));
                    }

                    // Determine if a left panel widget is set to show on startup, if so lay out the panel, but do not create widget yet
                    if (this._AppConfig.startupwidget && this._AppConfig.startupwidget !== 'none')
                        this._ShowLeftOrRightPanel('left');
                    /*if (this._AppConfig.leftPanelVisibility) // Show the left pane on startup
                        this._ShowLeftOrRightPanel('left');*/
                }

                , FinalizeLayout: function(webMap, map) {
                    this._WebMap = webMap;
                    this._Map = map;
                    document.title = this._AppConfig.title || this._WebMap.item.title;
                    this._AppConfig.owner = this._WebMap.item.owner;

                    //Overlay toolbar on map
                    var placeholder = dojo.byId('toolbarContainer');
                    dojo.byId('map_root').appendChild(placeholder);

                    if (!this._AppConfig.embed) {
                        //create the links for the top of the application, if provided
                        if (this._AppConfig.link1.url && this._AppConfig.link2.url) {
                            esri.show(dojo.byId('nav'));
                            dojo.create("a", {
                                href: this._AppConfig.link1.url,
                                target: '_blank',
                                innerHTML: this._AppConfig.link1.text
                            }, 'link1List');
                            dojo.create("a", {
                                href: this._AppConfig.link2.url,
                                target: '_blank',
                                innerHTML: this._AppConfig.link2.text
                            }, 'link2List');
                        }
                    }

                    //add webmap's description to details panel
                    if (this._AppConfig.description === "") {
                        if (this._WebMap.item.description !== null) {
                            this._AppConfig.description = this._WebMap.item.description;
                        }
                    }

                    //add a custom logo to the map if provided
                    if (this._AppConfig.customlogo.image) {
                        esri.show(dojo.byId('logo'));
                        //if a link isn't provided don't make the logo clickable
                        if (this._AppConfig.customlogo.link) {
                            var link = dojo.create('a', {
                                href: this._AppConfig.customlogo.link,
                                target: '_blank'
                            }, dojo.byId('logo'));
                            dojo.create('img', {
                                src: this._AppConfig.customlogo.image
                            }, link);
                        } else {
                            dojo.create('img', {
                                id: 'logoImage',
                                src: this._AppConfig.customlogo.image
                            }, dojo.byId('logo'));
                            //set the cursor to the default instead of the pointer since the logo is not clickable
                            dojo.style(dojo.byId('logo'), 'cursor', 'default');
                        }
                    }

                    if (this._AppConfig.displaysearch === 'true' || this._AppConfig.displaysearch === true) {
                        //Create the search location tool
                        require(["../geolocator"],
                            lang.hitch(this, function(geolocator) {
                                var geoloc = new geolocator({ //Set the required properties of the module
                                    geocoderUrl: this._AppConfig.placefinder.url
                                    , map: this._Map
                                    , sourceCountry: this._AppConfig.placefinder.countryCode
                                });
                            })
                        );
                    }

                    if (this._AppConfig.displayoverviewmap === 'true' || this._AppConfig.displayoverviewmap === true) {
                        //Create the overview map
                        require(["../ovmap"],
                            lang.hitch(this, function(overviewmap) {
                                var ovmap = new overviewmap({
                                    map: this._Map
                                });
                            })
                        );
                    }

                    //Set the toolbar

                }

                , _DisplayLeftPanel: function () {
                    //display the left panel if any of these options are enabled.
                    var display = false;
                    if (this._AppConfig.displaydetails && this._AppConfig.description !== '') {
                        display = true;
                    }
                    if (this._AppConfig.displaylegend) {
                        display = true;
                    }
                    if (this._AppConfig.displayeditor) {
                        display = true;
                    }
                    return display;
                }

                , _ShowLeftOrRightPanel: function (direction) {
                    var targetDivId = direction.toLowerCase() + "Pane";
                    var targetDiv = dojo.byId(targetDivId);
                    var targetPaneWidth = dojo.style(targetDiv, "width");
                    if (targetPaneWidth === 0) {
                        dojo.style(targetDiv, "width", configOptions[targetDivId.toLowerCase() + "width"] + "px");
                        dijit.byId("mainWindow").resize();
                    }
                }

                , HideLeftOrRightPanel: function (direction) {
                    //close the left panel when x button is clicked
                    direction = direction.toLowerCase();
                    var targetDivId = direction + "Pane";
                    var targetDiv = dojo.byId(targetDivId);
                    var targetPaneWidth = dojo.style(targetDiv, "width");
                    if (targetPaneWidth === 0) {
                        targetPaneWidth = configOptions[targetDivId.toLowerCase() + "width"];
                    }
                    dojo.style(targetDiv, "width", "0px");
                    dijit.byId('mainWindow').resize();
                    resizeMap();
                    //uncheck the edit, detail and legend buttons
                    if (direction === 'left') {
                        setTimeout(function () {
                            toggleToolbarButtons('');
                        }, 100);
                    }
                }
            }
        )
    }
);