class obj { //basic object to draw
  this.id = 0000; //unique identifier
  this.name = "default object"; //not necesarily unique
  this.visible = true; //draw or not

  this.draw = function() {}
}


class PhysicsObj extends obj { //physics applies to objects
  this.mass = 100; //mass in kg

  this.location = Victor(0,0)
  this.netForce = Victor(0,0);
	this.velocity = Victor(0,0);
	this.angularVelocity = Victor(0,-1);

  this.clone = function() { return Object.assign({}, this); };
  this.collide = function(o2) {}; //collision with object o2
}


class Ship extends PhysicsObj { //basic ship object
  this.thrustPower = 100; //force in Newtons
}
