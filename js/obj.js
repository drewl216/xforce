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

		this.pos = new Victor(0,0);
		this.vel = new Victor(0,0);
		this.rot = new Victor(0,-1);
		this.rot_vel = 0; //Victor(0,-1); TODO - add angular momemtum to objects/collisions

		this.is_visible = true;
		this.color = {r:255, g:255, b:255};

		this.mass = 100;// obj_default_mass
    this.net_force = Victor(0,0);

    this.no_gravity=false;
    this.no_gravity_movement=false;
    this.no_collision = false;
    this.no_collision_movement = false;
    this.collision_type = 'bounce';
    this.collision_energy_loss_percent = 0.0000000;  // causes them to freez & lockup when 3 or more are enntangled :(
}



collide(o2) {
	o1 = this;
	var relative_vel_mag = Math.sqrt( Math.pow((o1.vel.x-o2.vel.x), 2) + Math.pow((o1.vel.y-o2.vel.y), 2) );
	var dist = Math.sqrt( Math.pow((o1.x-o2.x), 2) + Math.pow((o1.y-o2.y), 2) );
	var min_dist = o1.diam/2 + o2.diam/2;
	var over_dist = min_dist-dist;
	var dist_err = over_dist/min_dist;
	uN = new Victor((o2.x-o1.x), (o2.y-o1.y)).normalize();

	//COMBINE THESE 2 OBJECTS INTO o1, destroy o2
	if(this.collision_type=='merge')
	{
		//clone 'this' into o1 (so we don't change o1's original attributes just yet)
		var o1 = this.clone();
		//find center of mass  -  http://hyperphysics.phy-astr.gsu.edu/hbase/cm.html
		var new_mass = (o1.mass+o2.mass);
		this.x = (o1.mass*o1.x + o2.mass*o2.x) / new_mass;
		this.y = (o1.mass*o1.y + o2.mass*o2.y) / new_mass;
		//find velocities (preserve momentum)
		var total_momentum_i = (o1.mass*o1.vel.x + o2.mass*o2.vel.x);
		this.vel.x = total_momentum_i / new_mass;
		var total_momentum_j = (o1.mass*o1.vel.y + o2.mass*o2.vel.y);
		this.vel.y = total_momentum_j / new_mass;
		this.mass = new_mass;
		this.density = o1.density;
		var new_area = new_mass/o1.density;
		var mew_diam = Math.sqrt((new_area/Math.PI))*2;
		this.set_diam(mew_diam);
		var o1perc = o1.mass/this.mass;
		var o2perc = o2.mass/this.mass;
		this.color.r = o1.color.r*o1perc + o2.color.r*o2perc;
		this.color.g = o1.color.g*o1perc + o2.color.g*o2perc;
		this.color.b = o1.color.b*o1perc + o2.color.b*o2perc;
		//DISABLE THE COLLIDING OBJECT
		o2.disabled=true;
	}
	if(this.collision_type=='bounce'){

		//roll back 1 full step to find accurate collision
		var x1 = o1.x - o1.vel.x*step_size;
		var y1 = o1.y - o1.vel.y*step_size;
		var x2 = o2.x - o2.vel.x*step_size;
		var y2 = o2.y - o2.vel.y*step_size;

		//if rolling back a full step won't help then forcibly move them apart on their normal vector (they're probably stuck on eachother)
		var newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
		if(newdist < min_dist) { //they're still collided even after backing up a step
			//console.log("pull appart : "+relative_vel_mag);
			var o1_mass_perc = o1.mass/(o1.mass+o2.mass);
			var o2_mass_perc = o2.mass/(o2.mass+o1.mass);
			//console.log("m1"+o1.mass+"("+o1_mass_perc+")   m2"+o2.mass+"("+o2_mass_perc+")");
			var o1move = (o1.no_collision_movement? 0 : (o2.no_collision_movement? over_dist:over_dist*o2_mass_perc) );
			var o2move = (o2.no_collision_movement? 0 : (o1.no_collision_movement? over_dist:over_dist*o1_mass_perc) );
			if(o1move>0) { o1.x -= uN.x*o1move; o1.y -= uN.y*o1move; }
			if(o2move>0) { o2.x += uN.x*o2move; o2.y += uN.y*o2move; }
		}
		else
		{
			//calculate real collision times/positions
			//fix any overlap
			if(dist_err>0.00001)
			{
				//advance time slowly until they're colliding
				var scnt = 0;
				var resolution = 2;
				var substep = step_size / resolution;
				while(true){
					scnt++;

					var x1_last = x1;
					var y1_last = y1;
					var x2_last = x2;
					var y2_last = y2;

					x1 += o1.vel.x*substep; y1 += o1.vel.y*substep;
					x2 += o2.vel.x*substep; y2 += o2.vel.y*substep;

					var newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );

					if(scnt>1000) { /*console.log('BREAK! Ran #'+scnt+' resolution:'+resolution + ' dist:'+newdist  );*/ break; }
					if(newdist <= min_dist) { //we collided
						//go back to last non-collision value
						x1 = x1_last; y1 = y1_last;
						x2 = x2_last; y2 = y2_last;

						if(resolution >= 1048576) { //we've reached the desired resolution
							newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
							//console.log("DONE!"+newdist+" ran "+scnt+" times");
							break;
						} //we got very good resolution, quit

						//and increas resoltuion
						resolution *= 2;
						substep = step_size / resolution;
						continue;
					}
				}

				//store this value
				o1.x = x1; o1.y = y1;
				o2.x = x2; o2.y = y2;
			}
		}

		//http://vobarian.com/collisions/2dcollisions2.pdf
		var uN = new Victor((o2.x-o1.x), (o2.y-o1.y)).normalize();
		var uT = new Victor(-1*uN.y, uN.x);

		var o1vel_V = new Victor(o1.vel.x, o1.vel.y);
		var o1velN = o1vel_V.dot(uN); // component of o1 velocity in normal direction
		var o1velT = o1vel_V.dot(uT); // component of o1 velocity in tangent direction

		var o2vel_V = new Victor(o2.vel.x, o2.vel.y);
		var o2velN = o2vel_V.dot(uN); // component of o2 velocity in normal direction
		var o2velT = o2vel_V.dot(uT); // component of o2 velocity in tangent direction

		//objects already moving away from the collision?
		if(o1velN<=0 && o2velN>=0) return;

		//compute the new 1d velocity magnitude along the normal vector
		if(o1.no_collision_movement) { new_o1velN = o1velN; if(!o2.no_collision_movement){new_o2velN = o2velN*-1;} }
		else if(o2.no_collision_movement) { new_o2velN = o2velN; if(!o1.no_collision_movement){new_o1velN = o1velN*-1;} }
		else { //normal collision
			var new_o1velN =  ( o1velN*(o1.mass-o2.mass) + 2*o2.mass*o2velN ) / (o1.mass + o2.mass);
			var new_o2velN =  ( o2velN*(o2.mass-o1.mass) + 2*o1.mass*o1velN ) / (o1.mass + o2.mass);
		}

		//simulate energy loss in collision - reduce velocity in this direction
		new_o1velN *= (1.0-this.collision_energy_loss_percent);
		new_o2velN *= (1.0-this.collision_energy_loss_percent);

		//console.log("\n\nORIG");
		//console.log('o1:' + o1.vel.x + ' ' + o1.vel.y);
		//console.log('o2:' + o2.vel.x + ' ' + o2.vel.y);
		//console.log('velN 1:' + o1velN);
		//console.log('NEW velN 1:' +new_o1velN);
		//console.log('velN 2:' + o2velN);
		//console.log('NEW velN 2:' +new_o2velN);


		//get the new velocity vectors (in normal direction)
		var new_o1velN_V = new Victor(new_o1velN*uN.x,new_o1velN*uN.y);
		var new_o2velN_V = new Victor(new_o2velN*uN.x,new_o2velN*uN.y);
		//get the velocity vectors (in tangent direction) - they haven't changed
		var new_o1velT_V = new Victor(o1velT*uT.x,o1velT*uT.y);
		var new_o2velT_V = new Victor(o2velT*uT.x,o2velT*uT.y);
		//new velocity vectors are sum of new Normal and Tangent Vectors
		var new_o1vel_V = new_o1velN_V.add(new_o1velT_V);
		var new_o2vel_V = new_o2velN_V.add(new_o2velT_V);
		//store back into our system

		if(!o1.no_collision_movement) {
			o1.vel.x = new_o1vel_V.x;
			o1.vel.y = new_o1vel_V.y;
		}
		if(!o2.no_collision_movement) {
			o2.vel.x = new_o2vel_V.x;
			o2.vel.y = new_o2vel_V.y;
		}
	}
}; //end collision function


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
		toSerialize.no_gravity                     = this.no_gravity;
		toSerialize.no_gravity_movement            = this.no_gravity_movement;
		toSerialize.no_collision                   = this.no_collision;
		toSerialize.no_collision_movement          = this.no_collision_movement;
		toSerialize.collision_type                 = this.collision_type;
		toSerialize.collision_energy_loss_percent  = this.collision_energy_loss_percent;

		return toSerialize;
	}


	/**
		create from a json version
		@param string json_str a json encoded xobj
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
		obj.no_gravity                     = object_parsed.no_gravity;
		obj.no_gravity_movement            = object_parsed.no_gravity_movement;
		obj.no_collision                   = object_parsed.no_collision;
		obj.no_collision_movement          = object_parsed.no_collision_movement;
		obj.collision_type                 = object_parsed.collision_type;
		obj.collision_energy_loss_percent  = object_parsed.collision_energy_loss_percent;
		return obj;
	}


} //end xobj class



/**
	allow the code to be loaded in either the browser or nodejs
*/
if (typeof module !== 'undefined') {
	module.exports=Obj;
};

