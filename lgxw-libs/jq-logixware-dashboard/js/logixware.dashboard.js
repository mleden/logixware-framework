/*
 * logixware-dashboard 2.0.1
 *
 * Copyright (c) 2014 Logixware
 * www.logixware.com
 *
 * See the Demo Documentation widget for details.

 * Dual licensed under the MIT and GPL licenses (same as jQuery):
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * This implementation borrows heavily from the following jQuery plugin:
 * http://connect.gxsoftware.com/dashboardplugin/demo/dashboard.html
 *
 * Copyright (c) 2010 Mark Machielsen
 *
 */

/*
 * BEGIN dashboard plugin closure.
 */
(function($) {
	/*
	 * BEGIN dashboard object constructor.
	 */
	$.fn.dashboard = function(options) {
		// Public properties of dashboard.
		var dashboard = {};
		var loading;
		var widgetDirectoryUrl;
		dashboard.layout
		dashboard.element = this;
		dashboard.id = this.attr("id");
		dashboard.widgets = {};
		dashboard.widgetsToAdd = {};
		dashboard.widgetCategories = {};
		dashboard.initialized = false;
		dashboard.dirty = false;
		// Has the user modified the dashboard (added/deleted/moved a widget or switched layout without saving)

		// Public methods
		dashboard.serialize = function() {
			dashboard.log("entering serialize function", 1);
			var r = '{"layout": "' + dashboard.layout.id + '", "data" : [';
			// add al widgets in the right order
			var i = 0;
			if ($("." + opts.columnClass).length == 0)
				dashboard.log(opts.columnClass + " class not found", 5);
			$('.' + opts.columnClass).each(function() {
				$(this).children().each(function() {
					if ($(this).hasClass(opts.widgetClass)) {
						if (i > 0) {
							r += ',';
						}
						r += (dashboard.getWidget($(this).attr("id"))).serialize();
						i++;
					}
				});
			});
			r += ']}';
			return r;
		}

		dashboard.log = function(msg, level) {
			if (level >= opts.debuglevel && typeof console != 'undefined') {
				var l = '';
				if (level == 1)
					l = 'INFO';
				if (level == 2)
					l = 'EVENT';
				if (level == 3)
					l = 'WARNING';
				if (level == 5)
					l = 'ERROR';
				console.log(l + ' - ' + msg);
			}
		}

		dashboard.setLayout = function(layout) {
			if (layout != null) {
				dashboard.log("entering setLayout function with layout " + layout.id, 1);
			} else {
				dashboard.log("entering setLayout function with layout null", 1);
			}
			dashboard.layout = layout;

			loading.remove();
			if (dashboard.layout != null) {
				if ( typeof opts.layoutClass != "undefined") {
					this.element.find('.' + opts.layoutClass).addClass(dashboard.layout.classname);
				} else {
					this.element.html(dashboard.layout.html);
				}
			}

			// make the columns sortable, see http://jqueryui.com/demos/sortable/ for explanation
			$('.' + opts.columnClass).sortable({
				connectWith : $('.' + opts.columnClass),
				opacity : opts.opacity,
				handle : '.' + opts.widgetHeaderClass,
				over : function(event, ui) {
					$(this).addClass("selectedcolumn");
				},
				out : function(event, ui) {
					$(this).removeClass("selectedcolumn");
				},
				receive : function(event, ui) {
					// update the column attribute for the widget
					var w = dashboard.getWidget(ui.item.attr("id"));
					w.column = getColumnIdentifier($(this).attr("class"));

					dashboard.log('dashboardStateChange event thrown for widget ' + w.id, 2);
					dashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "widgetMoved",
						"widget" : w
					});

					dashboard.log('widgetDropped event thrown for widget ' + w.id, 2);
					w.element.trigger("widgetDropped", {
						"widget" : w
					});
				},
				deactivate : function(event, ui) {
					// This event is called for each column
					dashboard.log('Widget is dropped: check if the column is now empty.', 1);
					var childLength = $(this).children().length;
					if (childLength == 0) {
						dashboard.log('adding the empty text to the column', 1);
						$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + '</div>');
					} else {
						if (childLength == 2) {
							// remove the empty column HTML
							$(this).find('.emptycolumn').remove();
						}
					}
				},
				start : function(event, ui) {
					ui.item.find('.' + opts.widgetTitleClass).addClass('noclick');
				},
				stop : function(event, ui) {
					//sorting changed (within one list)
					setTimeout(function() {
						ui.item.find('.' + opts.widgetTitleClass).removeClass('noclick');
					}, 300);
				}
			});
			fixSortableColumns();

			// trigger the dashboardLayoutLoaded event
			dashboard.log('dashboardLayoutLoaded event thrown', 2);
			dashboard.element.trigger("dashboardLayoutLoaded");
		}
		// This is a workaround for the following problem: when I drag a widget from column2 to column1, sometimes the widget is
		// moved to column3, which is not visible
		function fixSortableColumns() {
			dashboard.log('entering fixSortableColumns function', 1);
			$('.nonsortablecolumn').removeClass('nonsortablecolumn').addClass(opts.columnClass);
			$('.' + opts.columnClass).filter(function() {
				return $(this).css("display") == 'none'
			}).addClass('nonsortablecolumn').removeClass(opts.columnClass);
		}

		function getColumnIdentifier(classes) {
			dashboard.log('entering getColumnIdentifier function', 1);
			var r;
			var s = classes.split(" ");
			for (var i = 0; i < s.length; i++) {
				if (s[i].indexOf(opts.columnPrefix) === 0) {
					r = s[i]
				};
			};
			return r.replace(opts.columnPrefix, '');
		}

		/*
		 * Wrap EXTERNAL widget such that the user can easily open it in a new browser tab or window (i.e., outside of the dashboard).
		 */
		function getWrappedWidgetMarkup(title, url, architecture) {
			if (architecture === "EXTERNAL") {
				return '<a href="' + url + '" title="' + title + '" target="_blank">' + title + '&nbsp;<span class="glyphicon glyphicon-new-window"></span></a><iframe src="' + url + '" class="iframewidgetcontent"></iframe>';
			}
			if (architecture === "INDEPENDENT") {
				return '<iframe src="' + url + '" class="iframewidgetcontent"></iframe>';
			}
		}

		/**************************************************
		 * LW: Register the jQ events for the dashboard object(s).
		 **************************************************/
		function registerDashboardEventHandlers() {
			/*
			 * Bind event handlers for the dashboard object.
			 * Many of the "triggers" are based upon classnames that are captured as options of the dashboard object.
			 */
			var eventHandlerDescription;

			// Handle click on widget header to act as collapse/expand toggle.
			$(document).on("click", "#" + dashboard.id + " ." + opts.widgetTitleClass, function(e, o) {
				dashboard.log("Click on the header detected for widget " + $(this).attr("id"), 1);
				if (!$(this).hasClass("noclick")) {
					var wi = dashboard.getWidget($(this).closest("." + opts.widgetClass).attr("id"));
					if (wi.open) {
						dashboard.log("widgetCollapse event thrown for widget " + wi, 2);
						wi.element.trigger("widgetCollapse", {
							"widget" : wi
						});
					} else {
						dashboard.log("widgetExpand event thrown for widget " + wi, 2);
						wi.element.trigger("widgetExpand", {
							"widget" : wi
						});
					}
				}
				return false;
			});

			// Handle click on maximimize/normalize button.
			$(document).on("click", "#" + dashboard.id + " ." + opts.widgetFullScreenClass, function(e, o) {
				var wi = dashboard.getWidget($(this).closest('.' + opts.widgetClass).attr("id"));
				// Needed to explicitly hide the tooltip to prevent it from bleeding through the maximized widget container.
				$(this).tooltip("hide");
				if (wi.fullscreen) {
					dashboard.log("widgetNormalize event thrown for widget " + wi.id, 2);
					wi.element.trigger("widgetNormalize", {
						"widget" : wi
					});
				} else {
					dashboard.log("widgetMaximize event thrown for widget " + wi.id, 2);
					wi.element.trigger("widgetMaximize", {
						"widget" : wi
					});
				}
				return false;
			});

			// Handle "maximize" event.
			$(document).on("widgetMaximize", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.maximize();
			});

			// Handle "normalize" event.
			$(document).on("widgetNormalize", "." + opts.widgetClass, function(e, o) {
				o.widget.normalize();
			});

			// Handle click on "widget menu".
			$(document).on("click", "#" + dashboard.id + " ." + opts.menuClass + " li", function(e, o) {
				// use the class on the li to determine what action to trigger
				var wi = dashboard.getWidget($(this).closest("." + opts.widgetClass).attr("id"));
				dashboard.log($(this).attr("class") + " event thrown for widget " + wi.id, 2);
				wi.element.trigger($(this).attr("class"), {
					"widget" : wi
				});
			});

			// Handle "widget menu collapse" event.
			$(document).on("widgetCollapse", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				dashboard.log("Closing widget " + $(this).attr("id"), 1);
				o.widget.collapse();
			});

			// Handle "widget menu expand" event.
			$(document).on("widgetExpand", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				dashboard.log("Opening widget " + $(this).attr("id"), 1);
				o.widget.expand();
			});

			// Handle "widget menu delete" event.
			$(document).on("widgetDelete", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				if (confirm(opts.deleteConfirmMessage)) {
					dashboard.log("Removing widget " + $(this).attr("id"), 1);
					o.widget.remove();
				}
			});

			// Handle "widget menu refresh" event.
			$(document).on("widgetRefresh", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.refreshContent();
			});

			// Handle "widget menu about" event.
			$(document).on("widgetAbout", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.widgetAbout();
			});

			// Handle "widget show" event.
			$(document).on("widgetShow", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				$(this).find("." + opts.widgetContentClass).show();
			});

			// Handle "widget hide" event.
			$(document).on("widgetHide", "#" + dashboard.id + " ." + opts.widgetClass, function(e, o) {
				$(this).find("." + opts.widgetContentClass).hide();
			});

			/*
			* Bind event handlers for the dashboard dialogs/modals.
			*/
			// Handle click on the "edit layout" option.
			$(document).on("click", "body" + " ." + layoutOpts.openDialogClass, function(e, o) {
				dashboard.log("dashboardOpenLayoutDialog event thrown", 2);
				dashboard.element.trigger("dashboardOpenLayoutDialog");
				return false;
			});

			// Handle "open edit layout" event.
			$(document).on("dashboardOpenLayoutDialog", "body", function(e, o) {
				dashboard.log("Opening dialog " + layoutOpts.dialogId, 1);
				// add the layout images
				var h = $("#" + layoutOpts.dialogId).find("." + layoutOpts.layoutClass);
				h.empty();
				if (h.children().length == 0) {
					dashboard.log("Number of layouts: " + opts.layouts.length, 1);
					$.each(opts.layouts, function(i, item) {
						dashboard.log("Applying template: " + layoutOpts.layoutTemplate, 1);
						if ($("#" + layoutOpts.layoutTemplate).length == 0)
							dashboard.log("Template " + layoutOpts.layoutTemplate + " not found", 5);
						h.append(tmpl($("#" + layoutOpts.layoutTemplate).html(), item));
					});
				}
				// set the selected class for the selected layout
				$("." + layoutOpts.selectLayoutClass).removeClass(layoutOpts.selectedLayoutClass);
				$("#" + dashboard.layout.id).addClass(layoutOpts.selectedLayoutClass);
				bindSelectLayout();
				if (opts.uiFramework === "bootstrap3") {
					$("#" + layoutOpts.dialogId).modal();
				}
			});

			// Handle "close edit layout" event.
			$(document).on("dashboardCloseLayoutDialog", "body", function(e, o) {
				if (opts.uiFramework === "bootstrap3") {
					// close the dialog
					$("#" + layoutOpts.dialogId).modal("hide");
				}
			});

			// Handle click on "add widget" option.
			$(document).on("click", "." + addOpts.openDialogClass, function(e, o) {
				dashboard.log("dashboardOpenWidgetDialog event thrown", 2);
				dashboard.element.trigger("dashboardOpenWidgetDialog");
				return false;
			});

			// Handle "open add widget dialog" event.
			/*
			 * Changed from getJSON() method to ajax() method.
			 * Without this change, we were seeing multiple category and widget entries
			 * in the dialog.  Presumably, this was a knock-on effect to the way that we
			 * implemented multiple dashboards.
			 */
			$(document).on("dashboardOpenWidgetDialog", "body", function(e, o) {
				//remove existing categories/widgets from the DOM, to prevent duplications
				$("#" + addOpts.dialogId).find("." + addOpts.categoryClass).empty();
				$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).empty();
				$.ajax({
					url : addOpts.widgetDirectoryUrl,
					dataType : "json",
					async : false,
					success : function(json) {
						if (json.category == 0) {
							dashboard.log("Empty data returned", 3);
						}
						$.each(json.categories.category, function(i, item) {
							// Add the categories to the dashboard
							dashboard.widgetCategories[item.id] = item.url;
							dashboard.log("Applying template: " + addOpts.categoryTemplate, 1);
							if ($("#" + addOpts.categoryTemplate).length == 0)
								dashboard.log("Template " + addOpts.categoryTemplate + " not found", 5);
							var html = tmpl($("#" + addOpts.categoryTemplate).html(), item);
							$("#" + addOpts.dialogId).find("." + addOpts.categoryClass).append(html);
						});
						dashboard.element.trigger("addWidgetDialogCategoriesLoaded");
						dashboard.element.trigger("addWidgetDialogSelectCategory", {
							"category" : $("#" + addOpts.dialogId).find("." + addOpts.categoryClass + ">li:first")
						});
					}
				});
				if (opts.uiFramework === "bootstrap3") {
					$("#" + addOpts.dialogId).modal();
					//					$("#" + addOpts.dialogId).resizable();
				}
			});

			// Handle click on "add widget dialog select category" option.
			$(document).on("click", "." + addOpts.selectCategoryClass, function(e, o) {
				dashboard.log("addWidgetDialogSelectCategory event thrown", 2);
				dashboard.element.trigger("addWidgetDialogSelectCategory", {
					"category" : $(this)
				});
				return false;
			});

			// Handle "add widget select category" event.
			/*
			 * MWE: May 15, 2012
			 * Customized this function.  Changed from getJSON() method to ajax() method.
			 * Without this change, we were seeing multiple category and widget entries
			 * in the dialog.  Presumably, this was a knock-on effect to the way that we
			 * implemented multiple dashboards.
			 */
			$(document).on("addWidgetDialogSelectCategory", "body", function(e, o) {
				// remove the category selection
				$("." + addOpts.selectCategoryClass).removeClass(addOpts.selectedCategoryClass);
				// empty the widgets div
				$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).empty();
				// select the category
				$(o.category).addClass(addOpts.selectedCategoryClass);
				// get the widgets
				url = dashboard.widgetCategories[$(o.category).attr("id")];
				dashboard.log("Getting JSON feed : " + url, 1);
				$.ajax({
					url : url,
					dataType : "json",
					async : false,
					success : function(json) {
						// load the widgets from the category
						if (json.result.data == 0)
							dashboard.log("Empty data returned", 3);
						var items = json.result.data;
						if ( typeof json.result.data.length == "undefined") {
							items = new Array(json.result.data);
						}
						$.each(items, function(i, item) {
							dashboard.widgetsToAdd[item.id] = item;
							dashboard.log("Applying template : " + addOpts.widgetTemplate, 1);
							if ($("#" + addOpts.widgetTemplate).length == 0)
								dashboard.log("Template " + addOpts.widgetTemplate + " not found", 5);
							var html = tmpl($("#" + addOpts.widgetTemplate).html(), item);
							$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).append(html);
						});
						dashboard.log("addWidgetDialogWidgetsLoaded event thrown", 2);
						dashboard.element.trigger("addWidgetDialogWidgetsLoaded");
					}
				});
			});

			// Handle click on "add widget dialog add" option.
			$(document).on("click", "." + addOpts.addWidgetClass, function(e, o) {
				var widget = dashboard.widgetsToAdd[$(this).attr("id").replace("addwidget", "")];
				dashboard.log("dashboardAddWidget event thrown", 2);
				dashboard.element.trigger("dashboardAddWidget", {
					"widget" : widget
				});
				dashboard.log("dashboardCloseWidgetDialog event thrown", 2);
				dashboard.element.trigger("dashboardCloseWidgetDialog");
				return false;
			});

			// Handle "add widget dialog add" event.
			$(document).on("dashboardAddWidget", "body", function(e, o) {
				dashboard.log(this.id + ":" + e.type, 1);
				dashboard.addWidget({
					"id" : o.widget.id,
					"architecture" : o.widget.architecture,
					"creator" : o.widget.creator,
					"description" : o.widget.description,
					"email" : o.widget.email,
					"title" : o.widget.title,
					"url" : o.widget.url
				}, dashboard.element.find(".column:first"));
			});

			// Handle "add widget dialog close" event.
			$(document).on("dashboardCloseWidgetDialog", "body", function(e, o) {
				if (opts.uiFramework === "bootstrap3") {
					// close the modal
					$("#" + addOpts.dialogId).modal("hide");
				}
			});

			// Handle "dashboard state change" event.
			/*
			 * LW: Custom "state change" event
			 * This seems to handle:
			 * 1) Widget add - YES
			 * 2) Widget delete - YES
			 * 3) Widget relocate - PARTIAL (when moved to another column)
			 * 4) Layout change - NO
			 */
			$(document).on("dashboardStateChange", "body", function(e, o) {
				dashboard.log(this.id + ":" + e.type, 1);
				dashboard.dirty = true;
				if ( typeof opts.stateChangeUrl != "undefined" && opts.stateChangeUrl != null && opts.stateChangeUrl != "") {
					$.ajax({
						type : "POST",
						url : opts.stateChangeUrl,
						data : {
							dashboard : dashboard.element.attr("id"),
							settings : dashboard.serialize()
						},
						success : function(data) {
							if (data == "NOK" || data.indexOf("<response>NOK</response>") != -1) {
								dashboard.log("dashboardSaveFailed event thrown", 2);
								dashboard.element.trigger("dashboardSaveFailed");
							} else {
								dashboard.log("dashboardSuccessfulSaved event thrown", 2);
								dashboard.element.trigger("dashboardSuccessfulSaved");
							}
						},
						error : function(XMLHttpRequest, textStatus, errorThrown) {
							dashboard.log("dashboardSaveFailed event thrown", 2);
							dashboard.element.trigger("dashboardSaveFailed");
						},
						dataType : "text"
					});
				}
			});

			// Handle "edit layout dialog change" event.
			$(document).on("dashboardLayoutChanged", "body", function(e, o) {
				dashboard.log(this.id + ":" + e.type, 1);
				dashboard.dirty = true;
				// assemble data representing widgets in first column...
				$.each($(".column.first").find(".widget"), function(i) {
					dashboard.log("Building dashboard first column", 1);
					// MWE
					dashboard.getWidget(this.id).refreshContent();
				});
				// assemble data representing widgets in second column...
				$.each($(".column.second").find(".widget"), function(i) {
					dashboard.log("Building dashboard second column", 1);
					// MWE
					dashboard.getWidget(this.id).refreshContent();
				});
				// assemble data representing widgets in third column...
				$.each($(".column.third").find(".widget"), function(i) {
					dashboard.log("Building dashboard third column", 1);
					// MWE
					dashboard.getWidget(this.id).refreshContent();
				});
			});

			// Handle click on "save changes" option.
			$(document).on("click", "body" + " ." + opts.saveChangesClass, function(e, o) {
				dashboard.log("saveChangesClass event thrown", 2);
				alert("Not yet implemented.");
				return false;
			});

			// Handle "custom widget dropped" event.
			// Force a refresh of the widget to ensure that its content re-flows within its (new) container.
			$(document).on("widgetDropped", ".widget", function(e, o) {
				dashboard.log(this.id + ":" + e.type, 1);
				o.widget.refreshContent();
			});

			// FIXME: why doesn't the live construct work in this case
			function bindSelectLayout() {
				if ($("." + layoutOpts.selectLayoutClass).length == 0)
					dashboard.log("Unable to find " + layoutOpts.selectLayoutClass, 5);
				$("." + layoutOpts.selectLayoutClass).bind("click", function(e) {
					var currentLayout = dashboard.layout;
					dashboard.log("dashboardCloseLayoutDialog event thrown", 2);
					dashboard.element.trigger("dashboardCloseLayoutDialog");
					// Now set the new layout
					var newLayout = getLayout($(this).attr("id"));
					dashboard.layout = newLayout;
					// remove the class of the old layout
					if ( typeof opts.layoutClass != "undefined") {
						dashboard.element.find("." + opts.layoutClass).removeClass(currentLayout.classname).addClass(newLayout.classname);
						fixSortableColumns();
						// check if there are widgets in hidden columns, move them to the first column
						if ($("." + opts.columnClass).length == 0)
							dashboard.log("Unable to find " + opts.columnClass, 5);
						dashboard.element.find(".nonsortablecolumn").each(function() {
							// move the widgets to the first column
							$(this).children().appendTo(dashboard.element.find("." + opts.columnClass + ":first"));
							$(".emptycolumn").remove();
							// add the text to the empty columns
							$("." + opts.columnClass).each(function() {
								if ($(this).children().length == 0) {
									$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + "</div>");
								}
							});
						});
					} else {
						// set the new layout, but first move the dashboard to a temp
						var temp = $('<div style="display:none" id="tempdashboard"></div>');
						temp.appendTo($("body"));
						dashboard.element.children().appendTo(temp);
						// reload the dashboard
						dashboard.init();
					}
					// throw an event upon changing the layout.
					dashboard.log("dashboardChangeLayout event thrown", 2);
					dashboard.element.trigger("dashboardLayoutChanged");
				});
				return false;
			}

		}

		/*
		 * END registerDashboardEventHandlers
		 */

		dashboard.loadLayout = function() {
			dashboard.log("entering loadLayout function", 1);
			if ( typeof opts.json_data.url != "undefined" && opts.json_data.url.length > 0) {
				// ajax option
				dashboard.log("Getting JSON feed : " + opts.json_data.url, 1);
				$.getJSON(opts.json_data.url, function(json) {
					if (json == null) {
						alert("Unable to get json. If you are using chrome: there is an issue with loading json with local files. It works on a server :-)", 5);
						return;
					}
					// set the layout
					var obj = json.result;
					var currentLayout = ( typeof dashboard.layout != "undefined") ? dashboard.layout : getLayout(obj.layout);
					dashboard.setLayout(currentLayout);
					dashboard.loadWidgets(obj.data);
				});
			} else {
				// set the layout
				var currentLayout = ( typeof dashboard.layout != "undefined") ? dashboard.layout : getLayout(json.layout);
				dashboard.setLayout(currentLayout);
				dashboard.loadWidgets(opts.json_data.data);
			}
		};

		dashboard.addWidget = function(obj, column) {
			dashboard.log("entering addWidget function", 1);
			// add the widget to the column
			var wid = obj.id;

			// check if the widget is already registered and available in the dom
			if ( typeof dashboard.widgets[wid] != "undefined" && $("#" + wid).length > 0) {
				var wi = $("#" + wid);
				column = dashboard.widgets[wid].column;

				// add it to the column
				wi.appendTo(column);
			} else {
				// build the widget
				dashboard.log("Applying template : " + opts.widgetTemplate, 1);
				if ($("#" + opts.widgetTemplate).length == 0)
					dashboard.log("Template " + opts.widgetTemplate + " not found", 5);
				var widgetStr = tmpl($("#" + opts.widgetTemplate).html(), obj);
				var wi = $(widgetStr);

				// add it to the column
				wi.appendTo(column);

				dashboard.widgets[wid] = widget({
					id : wid,
					element : wi,
					architecture : obj.architecture,
					column : obj.column,
					creator : obj.creator,
					description : obj.description,
					editurl : obj.editurl,
					email : obj.email,
					open : obj.open,
					title : obj.title,
					url : obj.url
				});
			}

			dashboard.log("widgetAdded event thrown for widget " + wid, 2);
			dashboard.widgets[wid].element.trigger("widgetAdded", {
				"widget" : dashboard.widgets[wid]
			});

			if (dashboard.initialized) {
				dashboard.log("dashboardStateChange event thrown for widget " + wid, 2);
				dashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetAdded",
					"widget" : wi
				});
			}
		}

		dashboard.loadWidgets = function(data) {
			dashboard.log("entering loadWidgets function", 1);
			dashboard.element.find("." + opts.columnClass).empty();

			// This is for the manual feed
			$(data).each(function() {
				var column = this.column;
				dashboard.addWidget(this, dashboard.element.find("." + opts.columnPrefix + column));
			});
			// end loop for widgets

			// check if there are widgets in the temp dashboard which needs to be moved
			// this is not the correct place, but otherwise we are too late

			// check if there are still widgets in the temp
			$("#tempdashboard").find("." + opts.widgetClass).each(function() {
				// append it to the first column
				var firstCol = dashboard.element.find("." + opts.columnClass + ":first");
				$(this).appendTo(firstCol);

				// set the new column
				dashboard.getWidget($(this).attr("id")).column = firstCol.attr("id");
			});
			$("#tempdashboard").remove();

			// add the text to the empty columns
			$("." + opts.columnClass).each(function() {
				if ($(this).children().length == 0) {
					$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + '</div>');
				}
			});
			dashboard.initialized = true;
		};

		dashboard.init = function() {
			dashboard.log("entering init function", 1);
			// load the widgets as fast as we can. After that add the binding
			dashboard.loadLayout();
		}

		dashboard.getWidget = function(id) {
			dashboard.log("entering getWidget function", 1);
			var wi = dashboard.widgets[id];
			if ( typeof wi != "undefined") {
				return wi;
			} else {
				return null;
			}
		}
		// Merge in the caller's options with the defaults.
		var opts = $.extend({}, $.fn.dashboard.defaults, options);
		var addOpts = $.extend({}, $.fn.dashboard.defaults.addWidgetSettings, options.addWidgetSettings);
		var layoutOpts = $.extend({}, $.fn.dashboard.defaults.editLayoutSettings, options.editLayoutSettings);

		// Execution 'forks' here and restarts in init().  Tell the user we're busy with a loading.
		var loading = $(opts.loadingHtml).appendTo(dashboard.element);

		/**
		 * widget object
		 *    Private sub-class of dashboard
		 * Constructor starts
		 */
		function widget(widget) {
			dashboard.log("entering widget constructor", 1);
			// Merge default options with the options defined for this widget.
			widget = $.extend({}, $.fn.dashboard.widget.defaults, widget);

			// public functions
			widget.expand = function() {
				dashboard.log("entering expand function", 1);
				widget.element.find(".widgetExpand").hide();
				widget.element.find(".widgetCollapse").show();
				widget.open = true;
				widget.loaded = false;
				// artificial setting
				if (widget.loaded) {
					dashboard.log("widgetShow event thrown for widget " + widget.id, 2);
					widget.element.trigger("widgetShow", {
						"widget" : widget
					});
				} else {
					dashboard.log(this.architecture + " widget", 1);
					// add the loading
					$(opts.loadingHtml).appendTo(widget.element.find("." + opts.widgetContentClass));
					if (this.architecture === "DEPENDENT") {
						widget.element.find("." + opts.widgetContentClass).load(this.url, function(response, status, xhr) {
							if (status == "error") {
								widget.element.find("." + opts.widgetContentClass).html(opts.widgetNotFoundHtml);
							}
							widget.loaded = true;
						});
					} else {
						widget.element.find("." + opts.widgetContentClass).empty().append(getWrappedWidgetMarkup(this.title, this.url, this.architecture));
						/*
						 if (this.architecture === "INDEPENDENT") {
						 // add this class to eliminate "artificial" padding around the iframe
						 $(this).find(".widgetcontent").addClass("widgetcontent-independent");
						 }
						 */
					}
					dashboard.log("widgetShow event thrown for widget " + widget.id, 2);
					widget.element.trigger("widgetShow", {
						"widget" : widget
					});
					dashboard.log("widgetLoaded event thrown", 2);
					widget.element.trigger("widgetLoaded", {
						"widget" : widget
					});

				}
				if (dashboard.initialized) {
					dashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
					dashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "widgetExpanded",
						"widget" : widget
					});
				}
			};
			widget.refreshContent = function() {
				dashboard.log("entering refreshContent function", 1);
				widget.loaded = false;
				if (widget.open) {
					widget.expand();
				}
			}
			widget.setTitle = function(newTitle) {
				dashboard.log("entering setTitle function", 1);
				widget.title = newTitle;
				widget.element.find("." + opts.widgetTitleClass).html(newTitle);
				if (dashboard.initialized) {
					dashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
					dashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "titleChanged",
						"widget" : widget
					});
				}
			}
			widget.collapse = function() {
				dashboard.log("entering collapse function", 1);
				widget.open = false;
				dashboard.log("widgetHide event thrown for widget " + widget.id, 2);
				widget.element.trigger("widgetHide", {
					"widget" : widget
				});
				widget.element.find(".widgetExpand").show();
				widget.element.find(".widgetCollapse").hide();
				dashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
				dashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetClosed",
					"widget" : widget
				});
			};
			widget.openMenu = function() {
				dashboard.log("entering openMenu function", 1);
				widget.element.find("." + opts.menuClass).show();
			};
			widget.closeMenu = function() {
				dashboard.log("entering closeMenu function", 1);
				widget.element.find("." + opts.menuClass).hide();
			};
			widget.remove = function() {
				dashboard.log("entering remove function", 1);
				widget.element.remove();
				dashboard.log("widgetDeleted event thrown for widget " + widget.id, 2);
				widget.element.trigger("widgetDeleted", {
					"widget" : widget
				});
				dashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
				dashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetRemoved",
					"widget" : widget
				});
			};

			widget.widgetAbout = function() {
				dashboard.log("entering widgetAbout function", 1);
				var aboutHtml = "Name: " + "<b>" + widget.title + "</b>" + "<br />Creator: " + "<b>" + "<a href=mailto:" + widget.email + "?subject=" + emailSubject + ">" + widget.creator + "</a>" + "</b>" + "<br />Description: " + "<b>" + widget.description + "</b>" + "<br />Architecture: " + "<b>" + widget.architecture + "</b>" + "<br />URL: " + "<b>" + widget.url + "</b>";
				var aboutTitle = "About " + widget.title;
				var emailSubject = escape("About " + widget.title + " widget...");
				if (opts.uiFramework === "bootstrap3") {
					$("#aboutwidgetdialog").find(".modal-header h3").html(aboutTitle);
					$("#aboutwidgetdialog").find(".modal-body").html(aboutHtml);
					$("#aboutwidgetdialog").modal();
					//					$("#aboutwidgetdialog").resizable();
				}
			};

			widget.serialize = function() {
				dashboard.log("entering serialize function", 1);
				var r = '{"title" : "' + widget.title + '", "id" : "' + widget.id + '", "column" : "' + widget.column + '","editurl" : "' + widget.editurl + '","open" : ' + widget.open + ',"url" : "' + widget.url + '"';
				r += '}';
				return r;
			};
			widget.maximize = function() {
				dashboard.log("entering maximize function", 1);
				widget.fullscreen = true;
				// create "full-screen container" with "widget copy"
				var fs = $('<ul id="fullscreen_' + dashboard.id + '" class="columnmaximize"></ul>');
				widget.element.clone().appendTo(fs);
				// hide the layout div from the dashboard
				$(".layout").hide();
				// add "full-screen container" to the dashboard
				fs.appendTo(dashboard.element);
			};
			widget.normalize = function() {
				dashboard.log("entering normalize function", 1);
				widget.fullscreen = false;
				// remove "full-screen container" from dashboard
				$("#fullscreen_" + dashboard.id).remove();
				// show the layout div back on the dashboard
				$(".layout").show();
			};
			widget.openSettings = function() {
				dashboard.log("entering openSettings function", 1);
				widget.element.trigger("editSettings", {
					"widget" : widget
				});
			};
			// called when widget is initialized
			if (widget.open) {
				// init widget as expanded
				widget.expand();
			} else {
				// init widget as collapsed
				widget.collapse();
			}
			widget.initialized = true;
			dashboard.log("widgetInitialized event thrown", 2);
			widget.element.trigger("widgetInitialized", {
				"widget" : widget
			});
			return widget;
		};
		/*
		* End widget object sub-class
		*/

		// FIXME: can this be done easier??
		function getLayout(id) {
			dashboard.log("entering getLayout function", 1);
			var r = null;
			var first = null;
			if ( typeof opts.layouts != "undefined") {
				$.each(opts.layouts, function(i, item) {
					if (i == 0) {
						first = item;
					}
					if (item.id == id) {
						r = item;
					}
				});
			}
			if (r == null) {
				r = first
			}
			return r;
		}

		if ($("#" + addOpts.dialogId).length == 0) {
			dashboard.log("Unable to find " + addOpts.dialogId, 5);
		}

		if ($("#" + layoutOpts.dialogId).length == 0) {
			dashboard.log("Unable to find " + layoutOpts.dialogId, 5);
		}

		registerDashboardEventHandlers();

		return dashboard;
	};
	/*
	 * END dashboard object constructor.
	 */

	/*
	 * BEGIN dashboard public static properties.  Default settings.
	 */
	$.fn.dashboard.defaults = {
		addWidgetSettings : {
			addWidgetClass : "addwidget",
			categoryClass : "categories",
			categoryTemplate : "categorytemplate",
			dialogId : "addwidgetdialog",
			openDialogClass : "openaddwidgetdialog",
			selectCategoryClass : "selectcategory",
			selectedCategoryClass : "selected",
			widgetClass : "widgets",
			widgetTemplate : "addwidgettemplate"
		},
		columnClass : "column",
		columnPrefix : "column-",
		dashboardName : "DEFAULT",
		debuglevel : 3,
		deleteConfirmMessage : "Are you sure you want to delete this widget?",
		editLayoutSettings : {
			dialogId : "editLayout",
			layoutClass : "layoutselection",
			layoutTemplate : "selectlayouttemplate",
			openDialogClass : "editlayout",
			selectLayoutClass : "layoutchoice",
			selectedLayoutClass : "selected"
		},
		//    emptyColumnHtml: "Drag your widgets here", // Set this as "empty string" if you want no "drag and drop visual cues" on the "dashboard columns".
		emptyColumnHtml : "", // Set this as "empty string" if you want no "drag and drop visual cues" on the "dashboard columns".
		iconsClass : "icons",
		/*
		 * I fully qualified the following paths to image files.
		 * It shouldn't really be necessary, but I had trouble with it otherwise.
		 */
		layouts : [{
			title : "Layout1",
			id : "layout1",
			image : "../lgxw-libs/jq-logixware-dashboard/img/layout1.png",
			classname : "layout-a"
		}, {
			title : "Layout2",
			id : "layout2",
			image : "../lgxw-libs/jq-logixware-dashboard/img/layout2.png",
			classname : "layout-aa"
		}, {
			title : "Layout3",
			id : "layout3",
			image : "../lgxw-libs/jq-logixware-dashboard/img/layout3.png",
			classname : "layout-ba"
		}, {
			title : "Layout4",
			id : "layout4",
			image : "../lgxw-libs/jq-logixware-dashboard/img/layout4.png",
			classname : "layout-ab"
		}, {
			title : "Layout5",
			id : "layout5",
			image : "../lgxw-libs/jq-logixware-dashboard/img/layout5.png",
			classname : "layout-aaa"
		}],
		loadingHtml : '<div class="loading"><img alt="Loading, please wait" src="../lgxw-libs/jq-logixware-dashboard/img/loading.gif" /><p>Loading...</p></div>',
		//    menuClass: "controls",
		menuClass : "dropdown-menu",
		opacity : "0.2",
		saveChangesClass : "savechanges",
		stateChangeUrl : "",
		uiFramework : "bootstrap3",
		widgetClass : "widget",
		widgetContentClass : "widgetcontent",
		//    widgetContentClass: "box",
		widgetFullScreenClass : "widgetopenfullscreen",
		//    widgetHeaderClass: "widgetheader",
		widgetHeaderClass : "box-header",
		widgetNotFoundHtml : "The content of this widget has failed to load.  " + "<br /><br />This is likely to be the result of one or more of the following problems:" + "<ul>" + "<li>The widget includes authorization criteria that have not been satisfied.</li>" + "<li>The widget references file(s) or server(s) that no longer exist, are offline, or cannot be reached.</li>" + "<li>The widget's request for data or resources has timed out.</li>" + "</ul>",
		//    widgetTemplate: "widgettemplate-minimal",
		widgetTemplate : "widgettemplate-with-header",
		//    widgetTitleClass: "widgettitle",
		widgetTitleClass : "box-title",
		json_data : {}
	};
	/*
	 * END dashboard public static properties.
	 */

	/*
	 * BEGIN widget public static properties.  Default settings.
	 */
	$.fn.dashboard.widget = {
		defaults : {
			open : true,
			fullscreen : false,
			loaded : false,
			url : ""
		}
	};
	/*
	 * END widget public static properties.
	 */

})(jQuery);
/*
 * END dashboard plugin closure.
 */
