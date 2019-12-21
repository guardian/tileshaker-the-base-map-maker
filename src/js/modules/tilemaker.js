import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import GoogleMapsLoader from 'google-maps';
import mapstyles from '../modules/mapstyles-topo.json'
import L from 'leaflet'
import '../modules/Leaflet.GoogleMutant.js'
import html2canvas from 'html2canvas'
import * as turf from '@turf/turf' //jspm install npm:@turf/turf

import template from '../../templates/template.html'

import Ractive from 'ractive'
import ractiveTap from 'ractive-events-tap'
import ractiveEventsHover from 'ractive-events-hover'
import ractiveFade from 'ractive-transitions-fade'
import noUiSlider from 'nouislider'


export class Tilemaker {

	constructor(settings) {

		var self = this

        this.map = null

        this.settings = settings

        this.googleizer()

	} 

    isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    isBox(str) {
        try {
            var bbox = turf.bbox(JSON.parse(str));
        } catch (e) {
            return false;
        }
        return true;
    }

    ractivate() {

        var self = this

        this.ractive = new Ractive({
            events: { 
                tap: ractiveTap,
                hover: ractiveEventsHover
            },
            el: '#app',
            data: self.settings,
            template: template,
        })

        this.ractive.observe('geojson_input', ( input ) => {

            if (self.isJson(input)) {

                if (self.isBox(input)) {

                    var bbox = turf.bbox(JSON.parse(input));

                    var poly = turf.bboxPolygon(bbox);

                    self.geo(poly)

                } else {

                    console.log("What is this shit")

                }

               //self.settings.list = true

            } else {

               //self.settings.list = false

            }

            //self.ractive.set(self.settings)

        });


        this.ractive.on( 'keydown', function ( event ) {

            if (event.original.keyCode===13) {

                // self.settings.user_input = ""
                // self.settings.list = false
                // self.settings.radial = true
                // self.ractive.set(self.settings)
                // self.getClosest(lat, lng) 

                event.original.preventDefault()

            }
           

        });

        this.ractive.on('create', (context) => {

            console.log("Next please")

            //self.settings.info = false

            //self.ractive.set(self.settings)

        })

        this.compile()

    }

    compile() {

        var self = this

        var slider = document.getElementsByClassName('filter_slider')[0];

        noUiSlider.create(slider, {
            start: [self.settings.start],
            step: 10,
            connect: true,
            tooltips: true,
            range: {
                'min': 600,
                'max': 2600
            }
        });

        slider.noUiSlider.on('slide', function( values, handle, unencoded, tap, positions ) {

            self.settings.current = parseInt(values[0])

            /*

            self.database.DateStart = 

            self.database.DateEnd = parseInt(values[1])

            self.getData().then( (data) => {

                self.ractive.set(self.database)

            })

            */

        });

    }

    geo(poly) {

        var centroid = turf.centroid(poly);
        var lat = centroid.geometry.coordinates[1]
        var lng = centroid.geometry.coordinates[0]
        var southWest = poly.geometry.coordinates[0][0]
        var southEast = poly.geometry.coordinates[0][1]
        var northEast = poly.geometry.coordinates[0][2]
        var northWest = poly.geometry.coordinates[0][3]

        this.calculate(lat, lng, northWest, northEast, southWest, southEast)

    }

    calculate(lat, lng, northWest, northEast,southWest,southEast) {

        var width = this.distance(northWest, northEast)

        var height = this.distance(northWest, southWest)

        var ratio = 100 / width * height

        this.settings.map_height = this.settings.current * (ratio / 100)

        this.ractive.set('map_height', this.settings.map_height)

        var geojson_output = {

            "latitude" : lat,

            "longitude" : lng,

            "southWest" : southWest,

            "northEast" : northEast,

            "width" : this.settings.current,

            "height" : this.settings.map_height

        }

        this.initMap(geojson_output)

    }

    distance(from, to, units='kilometers') {

        var from = turf.point(from);
        var to = turf.point(to);
        var options = {units: units};

        var distance = turf.distance(from, to, options);

        return distance
    }

    googleizer() {

        var self = this

        GoogleMapsLoader.KEY = 'AIzaSyD8Op4vGvy_plVVJGjuC5r0ZbqmmoTOmKk';
        GoogleMapsLoader.REGION = 'AU';
        GoogleMapsLoader.load(function(google) {
            self.ractivate()
        });

    }

    initMap(geojson) {

        console.log(geojson)

        var self = this

        document.getElementById("map").style.width = geojson.width + "px";

        document.getElementById("map").style.height = geojson.height + "px";

        var southWest = L.latLng(geojson.southWest[1], geojson.southWest[0]),
            northEast = L.latLng(geojson.northEast[1], geojson.northEast[0]),
            bounds = L.latLngBounds(southWest, northEast);

        this.map = new L.Map('map', { 
            renderer: L.canvas(),
            center: new L.LatLng(geojson.latitude, geojson.longitude), 
            minZoom: 1,
            maxBounds: bounds,
            zoom: 12,
            maxZoom: 20,
            scrollWheelZoom: false,
            dragging: false,
            zoomControl: false,
            doubleClickZoom: false,
            zoomAnimation: false
        })

        this.map.fitBounds(bounds)

        var styled = L.gridLayer.googleMutant({

            type: 'terrain',

            styles: mapstyles

        }).addTo(self.map);

        self.bounds = self.map.getBounds()

        //[minX, minY, maxX, maxY]

        self.bbox([self.bounds._southWest.lng,self.bounds._northEast.lat,self.bounds._northEast.lng,self.bounds._southWest.lat])

        self.create()

    }

    bbox(array) {

        var poly = turf.bboxPolygon(array);

        this.bounder(poly)

    }

    bounder(bboxPolygon) {    

        const options = {

          layer: 'bbox',

          targetCrs: 4326

        }

        const featureCollection = { type: 'FeatureCollection', crs: { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::4326" } }, features: [ bboxPolygon ] }

        this.settings.geojson_output = JSON.stringify(featureCollection)

        this.ractive.set('geojson_output', this.settings.geojson_output)

    }

    getMatrix(el) {

        var values = el.style.transform.split(/\w+\(|\);?/);

        if (!values[1] || !values[1].length) {

            return [];

        }

        return values[1].split(/,\s?/g);

    }

    create() {

        var self = this

        var artboard = document.getElementsByClassName("rafael")[0];

        var dims = getDimensions(artboard)

        var width = dims[0]

        var height = dims[1]

        var output = document.createElement('canvas');

        output.id     = "canvas1";

        output.width  = width;

        output.height = height;

        document.body.appendChild(output);

        this.canvas = document.getElementById('canvas1');

        this.ctx = this.canvas.getContext('2d');

        setTimeout(function(){ self.generate(width, height); }, 3000);

    }

    async generate(width, height) {

        var self = this

        var tiles = document.getElementsByClassName("leaflet-tile")

        for await (const tile of tiles) {

            let matrix = self.getMatrix(tile)

            let image = tile.getElementsByTagName('img')[0]

            let json = JSON.parse(JSON.stringify(image))

            self.ctx.drawImage(image, parseInt(matrix[0]), parseInt(matrix[1]), 256, 256 );

        }

        document.getElementById("map").style.display = "none"

        // self.render(width, height);

    }

    render(width, height) {

        var self = this

        html2canvas(document.getElementById('canvas1'), { useCORS:true }).then(function (canvas) {

            self.settings.image_output = canvas.toDataURL(); //..oCtx.getImageData(0, 0, width, height);

            //var base64Data = imgBase64.replace(/^data:image\/png;base64,/, "");

        });

    }

}