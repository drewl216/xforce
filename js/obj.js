/**
	imports required for use on nodejs server
*/
if (typeof module !== 'undefined') {
	Util = require("../js/util.js");
	Victor = require("../js/victor.min.js");
};

class Obj
{
	constructor()
	{
		this.id = 0;

		this.x=0;
		this.y=0;
		this.z=0; //objects at -100 are on-screen and don't move, objects from -100 to 0 are in the forground and pan backwards, objects at 0 are in-field/in-play, objects from 0 to 100 are in the background, objects farther than 100 are so far away they will not move at all with panning (static, backgrounds, etc)

		this.pos = new Victor(0,0);
		this.vel = new Victor(0,0);
		this.rot = new Victor(0,-1);
		this.rot_vel = 0; //Victor(0,-1); TODO - add angular momemtum to objects/collisions

		this.is_visible = true;
		this.image='';
		this.color = {r:255, g:255, b:255};

		this.mass = 10;// obj_default_mass
    this.net_force = Victor(0,0);

    this.do_gravity=true;
    this.do_gravity_movement=true;
    this.do_collision = true;
    this.do_collision_movement = true;
    this.collision_type = 'bounce';	
    this.collision_energy_loss_percent = 0.0000000;  // causes them to freez & lockup when 3 or more are enntangled :(
	}

	//get cordinates where 0,0 is the top-left of the level (instead of -x, -y)
	// this is used to perform canvas-alignment calculations (image background, etc)
	get_pos_from_top_left() {
		var posvect = new Victor((this.x + Math.round(level_edge.x)), (this.y+Math.round(level_edge.y)));
		return posvect;
	}
	
	
	collide(o2) {
		var o1 = this;
		
		//create a new colission object
		var collision = new ObjCollision(o1,o2);
		//inform each object they are about to collide and give them an opportunity to set do_collision=false
		if(collision.do_collision) {
			o1.collision_check(collision,o2);
			o2.collision_check(collision,o1);
		}
		//if both objects still want to collide, calculate uN, the energy exchanged, and what the changes in velocity will be (but don't apply them)
		if(collision.do_collision) {
			collision.compute();
			o1.collision_computed(collision,o2);
			o2.collision_computed(collision,o1);
		}
		//now change the velocities of the objects based on deletaV, etc
		if(collision.do_collision) {
			collision.apply_forces();
			o1.collision_applied(collision,o2);
			o2.collision_applied(collision,o1);
		}
	
	}; //end collision function


	collision_check(collision,o2) {}
	collision_computed(collision,o2) {}
	collision_applied(collision,o2) {}

	get_health_color(percent)
	{
		//100-50 will cover green-yellow
		//50-100p will cover yellow-red
		if(percent>1) percent=1;
		if(percent<0) percent=0;
		var inner_perc = 0; 
		if(percent>.5) {
			inner_perc = (percent-.5)*2;
			var c1 = {r:50, g:200, b:0};
			var c2 = {r:255, g:255, b:0};
		}
		else {
			inner_perc = percent*2;
			var c1 = {r:255, g:255, b:0};
			var c2 = {r:255, g:0, b:0};
		}
		var color = { r:Math.round(c2.r + (c1.r-c2.r)*inner_perc),  g:Math.round(c2.g + (c1.g-c2.g)*inner_perc),  b:Math.round(c2.b + (c1.b-c2.b)*inner_perc) };
		return color;
	}


	/**
		moves the object to a random position between the given mins and the given maxes
		@param float xmax the max x coordnate
		@param float ymax the max y coordnate
		@param float xmin the min x coordnate
		@param float ymin the min y coordnate
	*/
	positionRandomly(xmin,ymin,xmax,ymax)
	{
		this.x = Util.rand(xmin,xmax);
		this.y = Util.rand(ymin,ymax);
	}

	draw() {}
	clone() { return Object.assign({}, this); }
	destroy() {}

	/**
		convert the object to JSON string
		@Return json representation of this object
	*/
	getToSerialize()
	{

		var toSerialize = {};
		
		toSerialize.id                             = this.id;
		toSerialize.x                              = this.x;
		toSerialize.y                              = this.y;
		toSerialize.pos                            = this.pos;
		toSerialize.vel                            = this.vel;
		toSerialize.rot                            = this.rot;
		toSerialize.rot_vel                        = this.rot_vel;
		toSerialize.is_visible                     = this.is_visible;
		toSerialize.color                          = this.color;
		toSerialize.mass                           = this.mass;
		toSerialize.net_force                      = this.net_force;
		toSerialize.do_gravity                     = this.do_gravity;
		toSerialize.do_gravity_movement            = this.do_gravity_movement;
		toSerialize.do_collision                   = this.do_collision;
		toSerialize.do_collision_movement          = this.do_collision_movement;
		toSerialize.collision_type                 = this.collision_type;
		toSerialize.collision_energy_loss_percent  = this.collision_energy_loss_percent;

		return toSerialize;
	}

	/**
		update object from a toSerialize() created object
		@param object_parsed an object created by toSerialize()
	*/
	updateFromSerialize(object_parsed)
	{
		this.id                             = object_parsed.id;
		this.x                              = object_parsed.x;
		this.y                              = object_parsed.y;
		this.pos                            = object_parsed.pos;
		this.vel                            = object_parsed.vel;
		this.rot                            = object_parsed.rot;
		this.rot_vel                        = object_parsed.rot_vel;
		this.is_visible                     = object_parsed.is_visible;
		this.color                          = object_parsed.color;
		this.mass                           = object_parsed.mass;
		this.net_force                      = object_parsed.net_force;
		this.do_gravity                     = object_parsed.do_gravity;
		this.do_gravity_movement            = object_parsed.do_gravity_movement;
		this.do_collision                   = object_parsed.do_collision;
		this.do_collision_movement          = object_parsed.do_collision_movement;
		this.collision_type                 = object_parsed.collision_type;
		this.collision_energy_loss_percent  = object_parsed.collision_energy_loss_percent;
	}

	/**
		create from a json version
		@param object_parsed an object created by toSerialize()
	*/
	static unSerialize(object_parsed)
	{
		var obj = new Obj();
		
		obj.id                             = object_parsed.id;
		obj.x                              = object_parsed.x;
		obj.y                              = object_parsed.y;
		obj.pos                            = object_parsed.pos;
		obj.vel                            = object_parsed.vel;
		obj.rot                            = object_parsed.rot;
		obj.rot_vel                        = object_parsed.rot_vel;
		obj.is_visible                     = object_parsed.is_visible;
		obj.color                          = object_parsed.color;
		obj.mass                           = object_parsed.mass;
		obj.net_force                      = object_parsed.net_force;
		obj.do_gravity                     = object_parsed.do_gravity;
		obj.do_gravity_movement            = object_parsed.do_gravity_movement;
		obj.do_collision                   = object_parsed.do_collision;
		obj.do_collision_movement          = object_parsed.do_collision_movement;
		obj.collision_type                 = object_parsed.collision_type;
		obj.collision_energy_loss_percent  = object_parsed.collision_energy_loss_percent;
		return obj;
	}




  kill() {
		var i = this.id;
		this.disabled=true;
  }



} //end xobj class




/**
	allow the code to be loaded in either the browser or nodejs
*/
if (typeof module !== 'undefined') {
	module.exports=Obj;
};

