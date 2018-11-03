class Obj { //basic object to draw
  constructor(){
    this.id = 0;
    this.name = "default object"; //not necesarily unique

    this.visible = true; //draw or not
    this.color =

    this.pos = Victor(0,0);
    this.vel = Victor(0,0);
    this.ang_vel = Victor(0,-1); //angular velocity
  }

  Clone(){
    return Object.assign({}, this);
  }

  Draw(){
    context.beginPath();
    context.arc(this.x, this.y, this.diam/2, 0, 2 * Math.PI, false);
    //context.shadowColor = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';   - The object shadow
    context.shadowBlur = this.diam*2;
    context.fillStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';   -   The object color
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';  - The line arround the object
    context.stroke();
  }
}





class PhysicsObj extends Obj { //physics applies to objects
  constructor() {
    this.name = "default physics object"; //not necesarily unique

    this.calc_forces = true; //apply forces or not
    this.net_force = Victor(0,0);

    this.calc_gravity = true; //will not be applied if calculateForces is false;
    this.mass = 100; //mass in kg

    this.calc_collisions = true;
    this.collisoion_radius = 1;
  }

  Collide(o2){}; //collision with object o2
}






class Ship extends PhysicsObj{ //basic ship object
  constructor(){
    this.name = "default ship"; //not necesarily unique

    this.thrustPower = 100; //force in Newtons
  }
}
