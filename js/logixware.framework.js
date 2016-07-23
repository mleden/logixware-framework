/*
* "Helper" variables and functions to implement the base
* Logixware Dashboard Plugin class.
*/

/*
* The following set of options/variables can be "easily overridden" in each "page init".
*/
// does page content url describe dashboards?
var isPageContentDashboards = true;
// debug level on scale of 1 (most logging) to 5 (least logging)
var pageDashboardDebugLevel = 5;
// url to navbar markup fragment
var pageNavbarUrl = null;
// url to sidebar markup fragment
var pageSidebarUrl = null;
// url to footbar markup fragment
var pageFootbarUrl = null;
// url to content markup fragment
var pageContentUrl = null;
// url to jquery templates that provide "core dashboard functionality" (e.g., widget, etc)
var pageCoreDashboardTemplatesUrl = "/logixware-framework/libs/jq-logixware-dashboard/fragments/demo-core-templates.html";
// url to jquery templates that provide "supplementary dashboard functionality based upon a particular UI framework" (e.g., dashboard, dialogs, etc)
var pageComponentTemplatesUrl = "/logixware-framework/libs/jq-logixware-dashboard/fragments/demo-bootstrap3-templates.html";
// dashboard layout class to use
var pageLayoutClass = "layout";
var queryStringParams = [], hash;
var selectedDashboardSimpleName;
var selectedDashboardOwner;
var selectedDashboardWidgetFeedUrl;
var selectedDashboardWidgetCategoriesUrl;
/*
 * Build the framework page, based upon options.
 */
function buildPage() {
	// Inject navbar fragment
	$(".header").load(pageNavbarUrl, function() {
		console.log("page navbar loaded");
		// Inject sidebar fragment
		$(".sidebar-offcanvas").load(pageSidebarUrl, function() {
			console.log("page sidebar loaded");
			$(".navbar-fixed-bottom").load(pageFootbarUrl, function() {
				console.log("page footbar loaded");
				if (isPageContentDashboards === true) {
					console.log("about to load dashboard(s) json");
					$.getJSON(pageContentUrl, function(json) {
						console.log("page dashboard(s) loaded");
						if (json === null) {
							alert("Unable to get json. If you are using chrome: there is an issue with loading json with local files. It works on a server :-)", 5);
							return;
						} else {
							$.each(json.views.view, function(i, v) {
								if (getDashboardSimpleName() === v.simplename) {
									selectedDashboardOwner = v.owner;
									selectedDashboardWidgetFeedUrl = v.widgetfeedurl;
									selectedDashboardWidgetCategoriesUrl = v.widgetcategoriesurl;
									return false;
								}
							});
							buildLogixwareDashboard();
						}
					});
				} else {
					// Generate page WITHOUT dashboard(s)...use html fragment
					$(".right-side").load(pageContentUrl, function() {
						console.log("page content loaded");
					});
				}
				registerFrameworkEventHandlers();
			});
		});
	});
}

/*
 * Build the basic Logixware Dashboard structure.
 */
function buildLogixwareDashboard() {
	$(document).load(pageComponentTemplatesUrl, function(templates) {
		// Inject the dashboard template into the page.
		$(".right-side").append(templates);
		$(".right-side").append('<div id="core-templates"></div>');
		$("#core-templates").hide();
		// Create a closure around callback in order to pass parameters
		$("#core-templates").load(pageCoreDashboardTemplatesUrl, function(data) {
			var dashboard = $("#dashboard").dashboard({
				addWidgetSettings : {
					widgetDirectoryUrl : selectedDashboardWidgetCategoriesUrl // widget category feed for this dashboard
				},
				debuglevel : pageDashboardDebugLevel, // determines what gets written to console for this dashboard
				layoutClass : pageLayoutClass, // layout class to enable this dashboard to switch layouts
				json_data : {
					url : selectedDashboardWidgetFeedUrl // widget feed for this dashboard
				}
			});
			// end dashboard object assignment
			dashboard.init();
			// the init builds the dashboard. This makes it possible to first unbind events before the dashboard is built.
		});
	});
}

function registerFrameworkEventHandlers() {
	/*
	 * Many of these are copied verbatim from AdminLTE.
	 * These handlers operate "page-wide", as opposed to the "dashboard-wide"
	 * handlers that are registered as part of the dashboard object construction.
	 */
	var eventHandlerDescription;
	//
	eventHandlerDescription = "Activating sidebar toggle";
	console.log(eventHandlerDescription);
	$("[data-toggle='offcanvas']").unbind();
	$("[data-toggle='offcanvas']").click(function(e) {
		e.preventDefault();
		toggleMenu();
	});
	//
	eventHandlerDescription = "Activating hover support for touch";
	console.log(eventHandlerDescription);
	$('.btn').unbind();
	$('.btn').bind('touchstart', function() {
		$(this).addClass('hover');
	}).bind('touchend', function() {
		$(this).removeClass('hover');
	});
	//
	eventHandlerDescription = "Activating Bootstrap tooltip on all widgets";
	console.log(eventHandlerDescription);
	//    $("[data-toggle='tooltip']").unbind();
	//   	$("[data-toggle='tooltip']").tooltip();
	//	$("[data-toggle='tooltip']").tooltip();
	$("body").tooltip({
		placement : "bottom",
		selector : "[data-toggle=tooltip]"
	});
	//
	eventHandlerDescription = "Activating collapse and remove controls on all widget headers";
	console.log(eventHandlerDescription);
	$("[data-widget='collapse']").unbind();
	$("[data-widget='collapse']").click(function() {
		//Find the box parent
		var box = $(this).parents(".box").first();
		//Find the body and the footer
		var bf = box.find(".box-body, .box-footer");
		if (!box.hasClass("collapsed-box")) {
			box.addClass("collapsed-box");
			//Convert minus into plus
			$(this).children(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
			bf.slideUp();
		} else {
			box.removeClass("collapsed-box");
			//Convert plus into minus
			$(this).children(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
			bf.slideDown();
		}
	});
	$('.btn-group[data-toggle="btn-toggle"]').each(function() {
		var group = $(this);
		$(this).find(".btn").click(function(e) {
			group.find(".btn.active").removeClass("active");
			$(this).addClass("active");
			e.preventDefault();
		});

	});
	$("[data-widget='remove']").unbind();
	$("[data-widget='remove']").click(function() {
		//Find the box parent
		var box = $(this).parents(".box").first();
		box.slideUp();
	});

	eventHandlerDescription = "Activating jQuery UI sortable on the To Do List widget";
	console.log(eventHandlerDescription);
	//jQuery UI sortable for the todo list
	$(".todo-list").sortable({
		placeholder : "sort-highlight",
		handle : ".handle",
		forcePlaceholderSize : true,
		zIndex : 999999
	}).disableSelection();

	eventHandlerDescription = "Activating treeview on the sidebar";
	console.log(eventHandlerDescription);
	/* Sidebar tree view */
	$(".sidebar .treeview").tree();
}

function getDashboardSimpleName() {
	var dashboardSimpleName = "DEFAULT";
	//
	if (queryStringParams.length > 0) {
		// Query string params are INCLUDED in URL...get the value for DASHBOARD parameter
		dashboardSimpleName = queryStringParams['dashboard'];
	} else {
		// Query String array is empty
	}
	//
	return dashboardSimpleName;
}

function toggleMenu() {
	$('.left-side').toggleClass("collapse-left");
	$(".right-side").toggleClass("strech");

/*
	$('.row-offcanvas').toggleClass('active');
	$('.left-side').removeClass("collapse-left");
	$(".right-side").removeClass("strech");
	$('.row-offcanvas').toggleClass("relative");
*/	


	//If window is small enough, enable sidebar push menu
/*
	if ($(window).width() <= 992) {
		$('.row-offcanvas').toggleClass('active');
		$('.left-side').removeClass("collapse-left");
		$(".right-side").removeClass("strech");
		$('.row-offcanvas').toggleClass("relative");
	} else {
		//Else, enable content streching
		$('.left-side').toggleClass("collapse-left");
		$(".right-side").toggleClass("strech");
	}
*/	
}

/*
 * SIDEBAR MENU
 * ------------
 * This is a custom plugin for the sidebar menu. It provides a tree view.
 *
 * Usage:
 * $(".sidebar).tree();
 *
 * Note: This plugin does not accept any options. Instead, it only requires a class
 *       added to the element that contains a sub-menu.
 *
 * When used with the sidebar, for example, it would look something like this:
 * <ul class='sidebar-menu'>
 *      <li class="treeview active">
 *          <a href="#>Menu</a>
 *          <ul class='treeview-menu'>
 *              <li class='active'><a href=#>Level 1</a></li>
 *          </ul>
 *      </li>
 * </ul>
 *
 * Add .active class to <li> elements if you want the menu to be open automatically
 * on page load. See above for an example.
 */
( function($) {
		"use strict";

		$.fn.tree = function() {

			return this.each(function() {
				var btn = $(this).children("a").first();
				var menu = $(this).children(".treeview-menu").first();
				var isActive = $(this).hasClass('active');

				//initialize already active menus
				if (isActive) {
					menu.show();
					btn.children(".fa-angle-left").first().removeClass("fa-angle-left").addClass("fa-angle-down");
				}
				//Slide open or close the menu on link click
				btn.click(function(e) {
					e.preventDefault();
					if (isActive) {
						//Slide up to close menu
						menu.slideUp();
						isActive = false;
						btn.children(".fa-angle-down").first().removeClass("fa-angle-down").addClass("fa-angle-left");
						btn.parent("li").removeClass("active");
					} else {
						//Slide down to open menu
						menu.slideDown();
						isActive = true;
						btn.children(".fa-angle-left").first().removeClass("fa-angle-left").addClass("fa-angle-down");
						btn.parent("li").addClass("active");
					}
				});

				/* Add margins to submenu elements to give it a tree look */
				menu.find("li > a").each(function() {
					//                var pad = parseInt($(this).css("margin-left")) + 10;
					var pad = 10;
					$(this).css({
						"margin-left" : pad + "px"
					});
				});

			});

		};

	}(jQuery));

