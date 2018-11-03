
class xobj
{
	constructor()
	{
		this.id = 0;

		this.x = myrand(0,xmax*2/3)+xmax/6;
		this.y = myrand(0,ymax*2/3)+ymax/6;

		this.pos = Victor(0,0);
		this.vel = Victor(0,0);
		this.rot = Victor(0,-1);
		this.rot_vel = 0; //Victor(0,-1); TODO - add angular momemtum to objects/collisions

		this.color = {r:0, g:0, b:255};//colorops[myrand(0,2)]; //{r:myrand(0,255), g:myrand(0,255), b:myrand(0,255)}

	this.type = 'planet';
	this.disabled = false;



	this.set_diam(20);
	}

	set_diam(d) {
		if(d==0.0) return;
		this.diam = d;
		this.area = (Math.PI*Math.pow(d/2,2));
		this.density = this.mass/this.area;
	}


	draw() {};
	clone() { return Object.assign({}, this); };



} //end xobj class
