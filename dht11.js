const dht = require("dht-sensor");
let lettura = dht.read(11, 18); //pin impostato come gpio
console.log(lettura);
