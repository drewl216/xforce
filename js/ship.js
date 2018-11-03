class ship extends PhysicsObj
{
  constructor(){
    super();
  }

  draw(){
    context.save(); // saves the coordinate system
    context.translate(this.x,this.y); // now the position (0,0) is found at (250,50)
    context.rotate(this.rot.angle() + Math.PI/2.0);  // rotate around the start point of your line

    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(7, 7);
    context.lineTo(-7, 7);
    context.fillStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';  - The line arround the object
    context.fill();
    context.stroke();

    context.beginPath();
    context.moveTo(0, -100);
    context.lineTo(0, -106);
    context.moveTo(-3, -103);
    context.lineTo(3, -103);
    context.stroke();

    context.beginPath();
    context.arc(0,0, this.diam/2, 0, 2 * Math.PI, false);
    context.lineWidth = 1;
    context.strokeStyle = 'rgb('+Math.round(100)+','+Math.round(100)+','+Math.round(100)+')';//'#000000';  - The line arround the object
    context.stroke();

    context.restore(); // restores the coordinate system back to (0,0)
  }
}
