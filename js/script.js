/* Author: Jason Sanford
http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_attributequery.php?geotable=parks&fields=prkname+as+name,st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson&parameters=ST_GeomFromText('POLYGON%20((-80.8532875366211%2035.12263551300835,%20-80.8532875366211%2035.15071181220918,%20-80.763937789917%2035.15071181220918,%20-80.763937789917%2035.12263551300835,%20-80.8532875366211%2035.12263551300835))',%204326)+%26%26transform(the_geom,4326)&format=json
*/

/* one big global, probably a better way */
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/",
	iw: new google.maps.InfoWindow(),
	searchLoc: null,
	results: [],
	styles: {
		results: {
			normal: {
				icon: new google.maps.MarkerImage("images/markers/small-red.png", null, null, new google.maps.Point(5, 5))
			},
			highlight: {
				icon: new google.maps.MarkerImage("images/markers/small-yellow.png", null, null, new google.maps.Point(5, 5))
			}
		}
	},
	meckBounds: new google.maps.LatLngBounds(new google.maps.LatLng(34.95752703354437, -81.14249404144287), new google.maps.LatLng(35.51956304128534, -80.56929524612427)),
	addressExamples: {
		currentIndex: 0,
		items: [
			"2311 Providence Rd",
			"508 Northgate Ave",
			"210 Hunter Ln",
			"5401 Coburg Ave"
		]
	}
};

/* document ready */

$(function(){

	odd.layout = $("body").layout({
		applyDefaultStyles: false,
		south: {
			size: 20,
			closable: false
		},
		north: {
			size: 45,
			closable: false
		},
		east: {
			size: 225,
			spacing_open: 15,
			spacing_closed:  15,
			initClosed: true,
			closable: true,
			resizable: false,
			onresize: rightResize,
			onopen: rightResize
		},
		west: {
			spacing_open: 15,
			spacing_closed:  15,
			size: 275,
			closable: true,
			resizable: false
		},
		center: {
			onresize: function(){
				var center = odd.map.getCenter();
				google.maps.event.trigger(odd.map, "resize");
				odd.map.setCenter(center);
			}
		}
	});
	
	odd.map = new google.maps.Map(document.getElementById("map-canvas"), {
		zoom: 10,
		center: new google.maps.LatLng(35.22720562368099, -80.84311660003662),
		streetViewControl: false,
		mapTypeId: "terrain",
		navigationControlOptions: {
			position: google.maps.ControlPosition.RIGHT_CENTER
		}
	});
	
	google.maps.event.addListener(odd.map, "click", function(evt){
		setSearchLoc(evt.latLng);
	});
	
	$("#footage-slider").slider({
		values: [1000, 5000],
		min: 0,
		max: 10000,
		step: 100,
		slide: function(event, ui){
			$("#footage").html(ui.values[0] + " - " + ui.values[1] + " ft.<sup>2</sup>");
		},
		stop: function(event, ui){
			updateResults(true);
		}
	}).slider("disable");
	
	$("#cost-slider").slider({
		values: [10000, 200000],
		min: 0,
		max: 1000000,
		step: 1000,
		slide: function(event, ui){
			$("#cost").html("$" + ui.values[0] + " - $" + ui.values[1]);
		},
		stop: function(event, ui){
			updateResults(true);
		}
	}).slider("disable");
	
	$("#date-slider").slider({
		values: [730, 1095],
		min: 0,
		max: 1095,
		step: 1,
		slide: function(event, ui){
			$("#date").html(dateFromDaysAgo(1095 - ui.values[0]) + " - " + dateFromDaysAgo(1095 - ui.values[1]));
		},
		stop: function(event, ui){
			updateResults(true);
		}
	}).slider("disable");
	$("#date").html(dateFromDaysAgo(365) + " - " + dateFromDaysAgo(0));
	
	
	$("#left div.param").click(function(){
		if (!odd.distanceWidget)
			return;
		$(this).find("div.slider").slider($(this).hasClass("active") ? "disable" : "enable");
		$(this).toggleClass("active");
		updateResults(true);
	});
	
	odd.geocoder = new google.maps.Geocoder();
	
	$("#text-search").keyup(function(event){
		if (!(event.keyCode==13))
			return;
		if (!($(this).val().length > 0))
			return;
		odd.geocoder.geocode({
			address: $(this).val(),
			bounds: odd.meckBounds
		}, function(results, status){
			switch (status){
				case "OK":
					if (!odd.meckBounds.contains(results[0].geometry.location)){
						message("No locations were found in the Charlotte-Mecklenburg area for the address you entered.");
						return;
					}
					setSearchLoc(results[0].geometry.location);
					break;
				case "ZERO_RESULTS":
					message("There were no results for the address you entered. Try another address.");
					break;
				default:
					message("There was a problem finding a location for the address you entered.");
			}
		});
	}).focus(function(){
		$(this).val("");
	});
	
	resetInputText();
		
	$("#a-about").click(function(){
		$("#about-panel").dialog({
			modal: true,
			width: 500,
			resizable: false,
			title: "About this Application"
		});
	});
	
});

$(window).resize(function(){
	google.maps.event.trigger(odd.map, "resize");
});

/* lives */

$(".result").live("mouseover mouseout", function(event){
	var gid = $(this).attr("id").split("-")[1];
	if (event.type == "mouseover"){
		$(this).addClass("hover");
		highlightMarker(gid);
	}else{
		$(this).removeClass("hover");
		restoreMarker(gid)
	}
});

/* functions */

function setSearchLoc(latLng){
	resetInputText()
	if (odd.distanceWidget){
		odd.distanceWidget.setOptions({position:latLng});
		if (!odd.map.getBounds().contains(latLng))
			odd.map.setCenter(latLng);
	}else{
		odd.distanceWidget = new DistanceWidget({
			map: odd.map,
			position: latLng,
			distance: 150, // Starting distance in m.
			minDistance: 50,
			maxDistance: 2500,
			color: '#000',
			activeColor: '#59b',
			sizerIcon: new google.maps.MarkerImage('images/resize-off.png'),
			activeSizerIcon: new google.maps.MarkerImage('images/resize.png')
		});
		google.maps.event.addListener(odd.distanceWidget, "distance_changed", updateSearchArea);
		google.maps.event.addListener(odd.distanceWidget, "position_changed", updateSearchArea);
		if (odd.map.getZoom() < 17){
			odd.map.setCenter(latLng);
			odd.map.setZoom(17);
			odd.map.setMapTypeId("roadmap");
		}
		updateResults();
		$("#getting-started").slideUp();
		odd.layout.open("east");
	}
}

function updateSearchArea(){
	if (odd.searchAreaTimer) {
		window.clearTimeout(odd.searchAreaTimer);
	}

	// Throttle the query
	odd.searchAreaTimer = window.setTimeout(function(){
		updateResults();
	}, 200);
}

function updateResults(rerunSpatial){
	if (!odd.distanceWidget)
		return;
	var removeThese = [];
	$.each(odd.results, function(result_index, result){
		if (rerunSpatial || distanceBetweenPoints(result.gVector.getPosition(), odd.distanceWidget.get("position")) > odd.distanceWidget.get("distance")){
			removeThese.push(result.row.gid);
		}
	});
	$.each(removeThese, function(i, o){
		removeResult(o);
	});
	$("#results-counter").html(odd.results.length);
	$.getJSON(odd.apiBase + "v1/ws_geo_projectpoint.php?x=" + odd.distanceWidget.get("position").lng() + "&y=" + odd.distanceWidget.get("position").lat() + "&fromsrid=4326&tosrid=2264&format=json&callback=?", function(data){
		if (!data || parseInt(data.total_rows) < 1)
			return
		var extraParams = 
		buildParams();
		$.getJSON(odd.apiBase + "v2/ws_geo_bufferpoint.php?x=" + data.rows[0].row.x_coordinate + "&y=" + data.rows[0].row.y_coordinate + "&srid=2264&geotable=building_permits&parameters=gid>-1" + extraParams + "&order=&limit=1000&format=json&fields=gid,project_name,project_address,square_footage,construction_cost,type_of_building,job_status,date_issued,mat_parcel_id,occupancy,st_asgeojson%28transform%28the_geom,4326%29,6%29+as+geojson&distance=" + (odd.distanceWidget.get("distance") * 3.280839895) + "&callback=?", function(data){
			if (!data || parseInt(data.total_rows) < 1)
				return;
			var addTheseObjs = [];
			$.each(data.rows, function(i, o){
				var addThis = true;
				$.each(odd.results, function(i2, o2){
					if (o2.row.gid == o.row.gid){
						addThis = false;
					}
				});
				if (addThis)
					addTheseObjs.push(o);
			});
			addThese(addTheseObjs);
			$("#results-counter").html(odd.results.length);
		});
	});
}

function removeResult(gid){
	$.each(odd.results, function(i, o){
		if (o.row.gid == gid){
			o.gVector.setMap(null);
			$("#result-" + gid ).remove()
			odd.results.splice(i, 1);
			return false;
		}
	});
}

function addThese(these){
	$.each(these, function(i, o){
		o.gVector = new GeoJSON(o.row.geojson);
		o.gVector.setIcon(odd.styles.results.normal.icon);
		o.gVector.setAnimation(google.maps.Animation.DROP);
		o.gVector.setMap(odd.map);
		google.maps.event.addListener(o.gVector, "click", function(evt){
			$("#results").scrollTo("#result-" + o.row.gid, 400);
		});
		google.maps.event.addListener(o.gVector, "mouseover", function(){
			o.gVector.setIcon(odd.styles.results.highlight.icon);
			$("#result-" + o.row.gid).addClass("hover");
		});
		google.maps.event.addListener(o.gVector, "mouseout", function(){
			o.gVector.setIcon(odd.styles.results.normal.icon);
			$("#result-" + o.row.gid).removeClass("hover");
		});
		odd.results.push(o);
		$("#results").append('<div id="result-' + o.row.gid + '" class="result"><div class="field project_address">' + o.row.project_address + '</div><div class="field project_name">' + o.row.project_name + '</div><div class="field date_issued">Issued: ' + o.row.date_issued + '</div><div class="field square_footage">Sq. Ft.: ' + addCommas(o.row.square_footage) + '</div><div class="field construction_cost">Cost: ' + ((o.row.construction_cost.length > 0 && parseInt(o.row.construction_cost) > 0) ? "$" : "") + addCommas(o.row.construction_cost) + '</div></div>');
	});
}

function clearResults(){
	$.each(odd.results, function(i, o){
		o.gVector.setMap(null);
	});
	odd.results.length = 0;
}

function buildParams(){
	var params = "";
	$("#left div.active").each(function(i, o){
		var slider$ = $(o).find("div.slider");
		if ($(this).hasClass("date")){
			params += "+AND+date_issued>=(current_date-" + (1095 - slider$.slider("values", 0)) + ")+AND+date_issued<=(current_date-" + (1095 - slider$.slider("values", 1)) + ")";
		}else{
			params += "+AND+" + slider$.attr("data-field") + "+BETWEEN+" + slider$.slider("values", 0) + "+AND+" + slider$.slider("values", 1);
		}
	});
	return params;
}

function highlightMarker(gid){
	$.each(odd.results, function(i, o){
		if (o.row.gid == gid){
			o.gVector.setIcon(odd.styles.results.highlight.icon);
			return false;
		}
	});
}

function restoreMarker(gid){
	$.each(odd.results, function(i, o){
		if (o.row.gid == gid){
			o.gVector.setIcon(odd.styles.results.normal.icon);
			return false;
		}
	});
}

/**
 * Calculates the distance between two latlng points in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 */
function distanceBetweenPoints(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6371000; // Radius of the Earth in m
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};

/**
 *
 * Date from days ago
 *
 **/
function dateFromDaysAgo(daysAgo){
	var myDate = new Date(new Date() - ((1000 * 60 * 60 * 24) * daysAgo));
	return (myDate.getMonth() + 1) + "/" + myDate.getDate() + "/" + myDate.getFullYear();
}

function rightResize(){
	$("#results").height($("#right-container").height() - 30);
}

/**
 *
 * Adds commas
 *
 */
function addCommas(nStr){nStr += '';x = nStr.split('.');x1 = x[0];x2 = x.length > 1 ? '.' + x[1] : '';	var rgx = /(\d+)(\d{3})/;while (rgx.test(x1)) {	x1 = x1.replace(rgx, '$1' + ',' + '$2');}return x1 + x2;}

function message(messageText){
	$("<div>" + messageText + "</div>").dialog();
}

function resetInputText(){
	$("#text-search").val("Enter an address - Try \"" + odd.addressExamples.items[odd.addressExamples.currentIndex] + "\"");
	odd.addressExamples.currentIndex += 1;
	if (odd.addressExamples.currentIndex > (odd.addressExamples.items.length - 1))
		odd.addressExamples.currentIndex = 0;
}