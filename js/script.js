/* Author: Jason Sanford
http://maps.co.mecklenburg.nc.us/rest/v1/ws_geo_attributequery.php?geotable=parks&fields=prkname+as+name,st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson&parameters=ST_GeomFromText('POLYGON%20((-80.8532875366211%2035.12263551300835,%20-80.8532875366211%2035.15071181220918,%20-80.763937789917%2035.15071181220918,%20-80.763937789917%2035.12263551300835,%20-80.8532875366211%2035.12263551300835))',%204326)+%26%26transform(the_geom,4326)&format=json
*/

/* one big global, probably a better way */
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/",
	polyGeomText: "st_asgeojson(transform(simplify(the_geom,5),4326),6)+as+geojson",
	polyGeomText: "st_asgeojson(transform(the_geom,4326),6)+as+geojson",
	layers: {},
	iw: new google.maps.InfoWindow(),
	searchLoc: null,
	query: {
		distance: 528
	},
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
	}
};

/* document ready */

$(function(){
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
			$("#date").html(ui.values[0] + " - " + ui.values[1]);
		},
		stop: function(event, ui){
			updateResults(true);
		}
	}).slider("disable");
	
	
	$(".param").click(function(){
		$(this).find("div.slider").slider($(this).hasClass("active") ? "disable" : "enable");
		$(this).toggleClass("active");
		updateResults(true);
	});
	
});

$(window).resize(function(){
	google.maps.event.trigger(odd.map, "resize");
});

/* lives */



/* functions */

function setSearchLoc(latLng){
	if (odd.distanceWidget){
		odd.distanceWidget.setOptions({position:latLng});
	}else{
		odd.distanceWidget = new DistanceWidget({
			map: odd.map,
			position: latLng,
			distance: 100, // Starting distance in m.
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
	$.getJSON(odd.apiBase + "v1/ws_geo_projectpoint.php?x=" + odd.distanceWidget.get("position").lng() + "&y=" + odd.distanceWidget.get("position").lat() + "&fromsrid=4326&tosrid=2264&format=json&callback=?", function(data){
		if (!data || parseInt(data.total_rows) < 1)
			return
		var extraParams = buildParams();
		$.getJSON(odd.apiBase + "v2/ws_geo_bufferpoint.php?x=" + data.rows[0].row.x_coordinate + "&y=" + data.rows[0].row.y_coordinate + "&srid=2264&geotable=building_permits&parameters=date_issued%3E%272010-01-01%27" + extraParams + "&order=&limit=1000&format=json&fields=gid,project_name,project_address,square_footage,construction_cost,type_of_building,job_status,date_issued,mat_parcel_id,occupancy,st_asgeojson%28transform%28the_geom,4326%29,6%29+as+geojson&distance=" + (odd.distanceWidget.get("distance") * 3.280839895) + "&callback=?", function(data){
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
			var content = '<table><tbody>';
			for (prop in o.row){
				if (prop != "geojson" && prop != "gid")
					content += '<tr><td>' + prop + '</td><td>' + o.row[prop] + '</td></tr>';
			}
			content += '</tbody></table>';
			odd.iw.setContent(content);
			odd.iw.setPosition(o.gVector.getPosition());
			odd.iw.open(odd.map);
		});
		google.maps.event.addListener(o.gVector, "mouseover", function(){
			o.gVector.setIcon(odd.styles.results.highlight.icon);
		});
		google.maps.event.addListener(o.gVector, "mouseout", function(){
			o.gVector.setIcon(odd.styles.results.normal.icon);
		});
		odd.results.push(o);
		$("#results").append('<div class="result-container"><div id="result-' + o.row.gid + '" class="result"><div class="field project_name">' + o.row.project_name + '</div><div class="field project_address">' + o.row.project_address + '</div><div class="field date_issued">' + o.row.date_issued + '</div><div class="field square_footage">' + addCommas(o.row.square_footage) + '</div><div class="field construction_cost">' + ((o.row.construction_cost.length > 0 && parseInt(o.row.construction_cost) > 0) ? "$" : "") + addCommas(o.row.construction_cost) + '</div><div class="field type_of_building">' + o.row.type_of_building + '</div><div class="field job_status">' + o.row.job_status + '</div><div class="clearit"></div></div></div>');
	});
}

function removeThese(these){}

function clearResults(){
	$.each(odd.results, function(i, o){
		o.gVector.setMap(null);
	});
	odd.results.length = 0;
}

function buildParams(){
	var params = "";
	$("#main div.left div.active").each(function(i, o){
		if ($(this).hasClass("date")){
			//date_issued>=(current_date-30)+AND+date_issued<=(current_date-20)
		}else{
			var slider$ = $(o).find("div.slider");
			params += "+AND+" + slider$.attr("data-field") + "+BETWEEN+" + slider$.slider("values", 0) + "+AND+" + slider$.slider("values", 1);
		}
	});
	return params;
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
 * Adds commas
 *
 */
function addCommas(nStr){nStr += '';x = nStr.split('.');x1 = x[0];x2 = x.length > 1 ? '.' + x[1] : '';	var rgx = /(\d+)(\d{3})/;while (rgx.test(x1)) {	x1 = x1.replace(rgx, '$1' + ',' + '$2');}return x1 + x2;}