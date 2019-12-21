    generate() {

        var self = this

        var target = document.getElementsByClassName("leaflet-tile-pane")[0];

        var artboard = document.getElementsByClassName("rafael")[0];

        var dims = getDimensions(artboard)

        var width = dims[0]

        var height = dims[1]

        console.log(width,height)


        var output = document.createElement('canvas');
        output.id     = "canvas1";
        output.width  = width;
        output.height = height;

        document.body.appendChild(output);

        var canvas1 = document.getElementById('canvas1');

        html2canvas(document.body).then(function(canvas) {
            var ctx = canvas1.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
            self.create(canvas1)
        });
        /*
        html2canvas(document.getElementById('canvas1'), {
            onrendered: function(canvas) {
                var canvas1 = document.getElementById('canvas1');
                var ctx = canvas1.getContext('2d');
                ctx.drawImage(canvas, 0, 0);
            }
        });
        */

    }

    create(canvasId) {

        var options = {
          name: 'testing', // default image
          type: 'jpg',         // default png, accepted values jpg or png
          quality: 1         // default 1, can select any value from 0 to 1 range
        }

        canvasToImage(canvasId, options);
         
    }