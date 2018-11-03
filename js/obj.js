
class Obj
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

		this.is_visible = true;
		this.color = {r:0, g:0, b:255};
}


	draw() {}
	clone() { return Object.assign({}, this); }
	destroy() {}
} //end xobj class
