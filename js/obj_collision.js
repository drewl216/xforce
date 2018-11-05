
class ObjCollision
{
	constructor(o1,o2)
	{
		this.o1 = o1;
		this.o2 = o2;
		this.collision_type = (o1.collision_type=='bounce' && o2.collision_type=='bounce')? 'bounce':'';
		this.do_collision = (o1.do_collision && o2.do_collision);
		
		
		
		//THESE MEMBER VARIABLES WILL ONLY BE SET AFTER THE COLLISION IS ACTUALLY COMPUTED
		
		this.uN = null; // a normal vector in the direction of their center of mass
		this.uT = null; // a normal vector in the tangential to the direction of their center of mass
		this.relative_vel_mag = null; //vector of the two object's velocity relative to eachother
		this.dist = 0; //scarlar of the distance from their centers of mass
		
		// New Velocity of each object
		this.new_o1vel_V = null;
		this.new_o2vel_V = null;

		//change in velocity of each object
		this.o1_deltaV = null;
		this.o2_deltaV = null;
		this.o1_deltaV_mag = 0;
		this.o2_deltaV_mag = 0;
		
		//scalar of total energy excahnged on a single object in this collision
		this.computed_energy = 0;
		this.computed_force = 0;  
		
		//in some cases, after a compute has already been performed, objects may wish to change the fundementals like mass/velocity and then recompute 
		this.recompute = false;
		//add forces in this moment (this is done after compute and before apply_forces())
		this.extra_forces = null;
	}


	//when an object is passed a collision object this allows it to quickly fetch the other object
	get_other_object(o){
		return (o.id==this.o1.id)? this.o2:this.o1; 
	}
	
	
	compute()
	{
		var o1 = this.o1;
		var o2 = this.o2;
		
		this.relative_vel_mag = Math.sqrt( Math.pow((o1.vel.x-o2.vel.x), 2) + Math.pow((o1.vel.y-o2.vel.y), 2) );
		this.dist = Math.sqrt( Math.pow((o1.x-o2.x), 2) + Math.pow((o1.y-o2.y), 2) );
		uN = new Victor((o2.x-o1.x), (o2.y-o1.y)).normalize();

		var min_dist = o1.diam/2 + o2.diam/2;
		var over_dist = min_dist - this.dist;
		var dist_err = over_dist / min_dist;
		
		if(this.collision_type=='bounce'){

			//roll back 1 full step to find accurate point of collision
			var x1 = o1.x - o1.vel.x*step_size;
			var y1 = o1.y - o1.vel.y*step_size;
			var x2 = o2.x - o2.vel.x*step_size;
			var y2 = o2.y - o2.vel.y*step_size;
			
			//if rolling back a full step won't help then forcibly move them apart on their normal vector (they're probably stuck on eachother)
			var newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
			if(newdist < min_dist) { //they're still collided even after backing up a step
				var o1_mass_perc = o1.mass/(o1.mass+o2.mass);
				var o2_mass_perc = o2.mass/(o2.mass+o1.mass);
				var o1move = (!o1.do_collision_movement? 0 : (!o2.do_collision_movement? over_dist:over_dist*o2_mass_perc) );
				var o2move = (!o2.do_collision_movement? 0 : (!o1.do_collision_movement? over_dist:over_dist*o1_mass_perc) );
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
			var uN = this.uN = new Victor((o2.x-o1.x), (o2.y-o1.y)).normalize();
			var uT = this.uT = new Victor(-1*uN.y, uN.x);
	
			var o1vel_V = new Victor(o1.vel.x, o1.vel.y);
			var o1velN = o1vel_V.dot(uN); // component of o1 velocity in normal direction
			var o1velT = o1vel_V.dot(uT); // component of o1 velocity in tangent direction
	
			var o2vel_V = new Victor(o2.vel.x, o2.vel.y);
			var o2velN = o2vel_V.dot(uN); // component of o2 velocity in normal direction
			var o2velT = o2vel_V.dot(uT); // component of o2 velocity in tangent direction
	
			//objects already moving away from the collision?
			//if(o1velN<=0 && o2velN>=0) return;
	
			//compute the new 1d velocity magnitude along the normal vector
			if(!o1.do_collision_movement) { new_o1velN = o1velN; if(o2.do_collision_movement){new_o2velN = o2velN*-1;} }
			else if(!o2.do_collision_movement) { new_o2velN = o2velN; if(o1.do_collision_movement){new_o1velN = o1velN*-1;} }
			else { //normal collision
				var new_o1velN =  ( o1velN*(o1.mass-o2.mass) + 2*o2.mass*o2velN ) / (o1.mass + o2.mass);
				var new_o2velN =  ( o2velN*(o2.mass-o1.mass) + 2*o1.mass*o1velN ) / (o1.mass + o2.mass);
			}
	
			//simulate energy loss in collision - reduce velocity in this direction
			new_o1velN *= (1.0-o1.collision_energy_loss_percent);
			new_o2velN *= (1.0-o2.collision_energy_loss_percent);
	
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
			this.new_o1vel_V = new_o1velN_V.add(new_o1velT_V);
			this.new_o2vel_V = new_o2velN_V.add(new_o2velT_V);
			
			//Todo: once we implement rotational velocity that change we'll also need to consider that energy when computing total energy of colission
			this.o1_deltaV = o1.vel.subtract(this.new_o1vel_V);
			this.o2_deltaV = o2.vel.subtract(this.new_o2vel_V);
			
			//total magnitude of velocity change
			this.o1_deltaV_mag = this.o1_deltaV.length();
			this.o2_deltaV_mag = this.o2_deltaV.length();
			
			this.computed_energy = .5 * o1.mass * Math.pow(this.o1_deltaV_mag,2);
			this.computed_force = o1.mass * this.o1_deltaV_mag;
		}
	}; //end collision function
	
	
	
	
	//ACTUALLY APPLY THE VELOCITIES COMPUTED IN compute() METHOD
	apply_forces()
	{
		//SEE IF THEY WANT US TO RECOMPUTE THE COLLISION (THEY CHANGED POS/MASS/VEL/ETC)
		if(this.recompute) { this.recompute=false; this.compute(); }

		var o1 = this.o1;
		var o2 = this.o2;
		
		//APPLY NEW VELOCITIES FROM COMPUTED COLLISION
		if(this.collision_type=='bounce'){
			//store back into our system
			if(o1.do_collision_movement) {
				o1.vel.x = this.new_o1vel_V.x;
				o1.vel.y = this.new_o1vel_V.y;
			}
			if(o2.do_collision_movement) {
				o2.vel.x = this.new_o2vel_V.x;
				o2.vel.y = this.new_o2vel_V.y;
			}
		}
		//COMBINE THESE 2 OBJECTS INTO o1, destroy o2
		if(this.collision_type=='merge')
		{
			//clone 'this' into o1 (so we don't change o1's original attributes just yet)
			var o3 = o1.clone();
			//find center of mass  -  http://hyperphysics.phy-astr.gsu.edu/hbase/cm.html
			var new_mass = (o3.mass+o2.mass);
			o1.x = (o3.mass*o3.x + o2.mass*o2.x) / new_mass;
			o1.y = (o3.mass*o3.y + o2.mass*o2.y) / new_mass;
			//find velocities (preserve momentum)
			var total_momentum_i = (o3.mass*o3.vel.x + o2.mass*o2.vel.x);
			o1.vel.x = total_momentum_i / new_mass;
			var total_momentum_j = (o3.mass*o3.vel.y + o2.mass*o2.vel.y);
			o1.vel.y = total_momentum_j / new_mass;
			o1.mass = new_mass;
			o1.density = o3.density;
			var new_area = new_mass/o3.density;
			var mew_diam = Math.sqrt((new_area/Math.PI))*2;
			o1.set_diam(mew_diam);
			var o3perc = o3.mass/o1.mass;
			var o2perc = o2.mass/o1.mass;
			o1.color.r = o3.color.r*o3perc + o2.color.r*o2perc;
			o1.color.g = o3.color.g*o3perc + o2.color.g*o2perc;
			o1.color.b = o3.color.b*o3perc + o2.color.b*o2perc;
			//DISABLE THE COLLIDING OBJECT
			o2.disabled=true;
			return;
		}
	}


} //end ObjCollision class

