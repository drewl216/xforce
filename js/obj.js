
class xobj
{
	constructor()
	{
	this.type = 'planet',
	this.disabled = false;
	this.no_gravity=false;
	this.no_gravity_movement=false;
	this.no_collision = false;
	this.no_collision_movement = false;

	var colorops = [];
	colorops[0]={r:200, g:0, b:0};
	colorops[1]={r:0, g:150, b:0};
	colorops[2]={r:0, g:0, b:255};

	this.x = myrand(0,xmax*2/3)+xmax/6;
	this.y = myrand(0,ymax*2/3)+ymax/6;
	this.forces = Victor(0,0);
	this.vel = Victor(0,0);
	this.rot = Victor(0,-1);
	this.rotvel = 0; //Victor(0,-1); TODO - add angular momemtum to objects/collisions
	this.mass = 100;// obj_default_mass,
	this.color = {r:0, g:0, b:255};//colorops[myrand(0,2)]; //{r:myrand(0,255), g:myrand(0,255), b:myrand(0,255)}

	this.collision_type = 'bounce';
	this.collision_energy_loss_percent = 0.0000000;  // causes them to freez & lockup when 3 or more are enntangled :(


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
