/* Author: Jason Sanford

*/
var odd = {
	
	apiBase: "http://maps.co.mecklenburg.nc.us/rest/v1/"
	
};
$(function(){
	
	odd.map = new google.maps.Map(document.getElementById("map-canvas"), {
		zoom: 10,
		center: new google.maps.LatLng(35.22720562368099, -80.84311660003662),
		streetViewControl: false,
		mapTypeId: "terrain"
	});
	
});





















