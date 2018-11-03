class Asteroid extends PhysicsObj
{
  constructor(){
    super();
    this.diam = 20;
  }

  draw(){
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
