class Obj { //basic object to draw
  constructor(){
    this.id = 0;
    this.name = "default object"; //not necesarily unique
    this.visible = true; //draw or not
  }
}

class PhysicsObj extends DrawObj { //physics applies to objects
  constructor() {
    this.name = "default physics object"; //not necesarily unique

    this.mass = 100; //mass in kg

    this.location = Victor(0,0)
    this.netForce = Victor(0,0);
  	this.velocity = Victor(0,0);
  	this.angularVelocity = Victor(0,-1);

    this.calculateGravity = true;
  }

  function clone(){
    return Object.assign({}, this);
  }

  function collide(o2){}; //collision with object o2
}


class Ship extends PhysicsObj{ //basic ship object
  constructor(){
    this.name = "default ship"; //not necesarily unique

    this.thrustPower = 100; //force in Newtons
  }
}
