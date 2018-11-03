class bullet extends PhysicsObj
{
  constructor(){
    super();
    this.diam = 3;
  }

  draw(){
    if(this.type=='bullet') {
			context.beginPath();
			context.arc(this.x, this.y, this.diam/2, 0, 2 * Math.PI, false);
	    context.fillStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';   -   The object color
	    context.fill();
	    context.strokeStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';  - The line arround the object
	    context.stroke();
    }
  }
}
