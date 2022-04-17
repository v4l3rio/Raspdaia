const r = require("rpio");
const dht = require("dht-sensor");
const LCD = require("lcdi2c");
const sensor = require('ds18b20-raspi');
const lcd1 = new LCD(1, 0x26, 20, 4); //schermo grosso 20x4
const lcd2 = new LCD(1,0x27,16,2); //schermo piccolo 16x2
const deviceIdInterno= '28-0215619119ff';
const deviceIdEsterno= '28-0114482da6aa';
r.init();
r.open(35, r.OUTPUT, r.LOW);
r.open(37, r.OUTPUT, r.LOW);
r.open(31, r.OUTPUT, r.LOW);

class TempInterna {
    constructor(){

    }
    leggi(){
        let lettura = sensor.readC(deviceIdInterno);
        return (lettura-7); //offset per lettura errata del sensore 
    }
}


class TempEsterna {
        constructor(){

        }
        leggi(){
            let lettura = sensor.readC(deviceIdEsterno);
            return lettura;
        }
    }


class Schermi{
    constructor(lcd1,lcd2){
        this.lcd1=lcd1;
        this.lcd2=lcd2;
    }

    scriviSuPiccolo(tempInterna,statoFC){
    
        let messaggio = "Temp: "+tempInterna+String.fromCharCode(223);
        //lcd sopra
        this.lcd2.clear();
        this.lcd2.println(messaggio,1);
        console.log(messaggio);
        if(statoFC===1)
        {
            messaggio = "Fine Corsa DX";
            this.lcd2.println(messaggio,2)
            console.log(messaggio);
        }
        else if(statoFC===-1)
        {
            messaggio = "Fine Corsa SX";
            this.lcd2.println(messaggio,2)
            console.log(messaggio);
        }
        //lcd sotto (big)

    }

    scriviSuGrande(tempEsterna,parametri){
        let messaggio = "Temp Est: "+tempEsterna;
        this.lcd1.clear();
        this.lcd1.println(messaggio);
        console.log(messaggio);

        messaggio = "Param: "+parametri[1]+" -> "+parametri[0];
        this.lcd1.println(messaggio,2);
        console.log(messaggio);
        
    }



}


class GestioneCaldaia{

    constructor(sensoreEsterno,sensoreInterno,schermi){
        this.sensoreInterno=sensoreInterno;
        this.sensoreEsterno=sensoreEsterno; 
        this.schermi=schermi;
        this.vettoreTemp = [[-10, -5], [-5, 0], [0, 5],[5, 10],[10, 15],[15, 20],[20, 100]];
        this.vettoreRange = [[54, 51], [51, 48], [48, 43],[43, 38],[38, 35],[35, 30], [35, 30]];

    }

    getTemperaturaEsterna(){
        return this.sensoreEsterno.leggi();
    }
    getTemperaturaInterna(){
        return this.sensoreInterno.leggi();
    }

    getParametriAcqua(){
        let trovato = false;
        let tempEsterna = this.getTemperaturaEsterna();
        let i = 0;
        console.log("Temp Esterna: "+tempEsterna);
        if (this.tempEsterna<this.vettoreTemp[0][0]){
            return;
        }
        else if(this.tempEsterna>this.vettoreTemp[this.vettoreTemp.length-1][1]){
            return;
        }

        while (!trovato){
            if (tempEsterna>=this.vettoreTemp[i][0] && tempEsterna<this.vettoreTemp[i][1]){
                trovato=true;
            } else {
                i++;
            }

        }


        let parametri = this.vettoreRange[i];
        return parametri;

    }

    fineCorsa(){
        r.open(16, r.INPUT);
        r.open(18, r.INPUT);

        if(r.read(16)===1)
        {
            return -1;
        }
        else if(r.read(18)===1)
        {
            return 1;
        }
        
        return 0;

    }

    aggiornaUIPiccolo(tempInterna,fineCorsa){
        this.schermi.scriviSuPiccolo(tempInterna,fineCorsa);
    }
    aggiornaUIGrande(tempEsterna,parametri){
        this.schermi.scriviSuGrande(tempEsterna.toFixed(2),parametri);
    }


    regola(parametri){
        let tempEsterna = this.getTemperaturaEsterna();
        let tempInterna = this.getTemperaturaInterna();
        let fineCorsa= this.fineCorsa();
        if(tempInterna < parametri[1] && fineCorsa > -1 ){ //aggiungere fine corsa ------------
            r.write(35,r.HIGH);
            r.write(37,r.LOW);
            r.msleep(400);      //più fredda
            r.write(35,r.LOW);
            r.write(37,r.LOW);
        } 

        if(tempInterna > parametri[0] && fineCorsa < 1 ){ //aggiungere fine corsa ------------
            r.write(35,r.LOW);
            r.write(37,r.HIGH);
            r.msleep(400);      //più calda
            r.write(35,r.LOW);
            r.write(37,r.LOW);
           
        }

        this.aggiornaUIGrande(tempEsterna,parametri);
        this.aggiornaUIPiccolo(tempInterna,fineCorsa);
    }

    
}

let sensoreEsterno = new TempEsterna();
let sensoreInterno = new TempInterna();

let schermi = new Schermi(lcd1,lcd2);

let gestioneCaldaia = new GestioneCaldaia(sensoreEsterno,sensoreInterno,schermi);

let tempEsternaInterval = setInterval(function(){
    let parametri=gestioneCaldaia.getParametriAcqua();
    gestioneCaldaia.regola(parametri);
},35000);



