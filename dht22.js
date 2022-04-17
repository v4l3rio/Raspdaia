const dht = require("dht-sensor");
 let lettura = dht.read(22, 18); //pin impostato come gpio
        console.log(lettura);
