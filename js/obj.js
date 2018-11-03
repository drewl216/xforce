
function xobj() {
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
	
	this.set_diam = function(d) {
		if(d==0.0) return;
		this.diam = d;
		this.area = (Math.PI*Math.pow(d/2,2));
		this.density = this.mass/this.area;
	}
	this.set_diam(20);
	
	
	this.draw = function() {
    if(this.type=='planet' || this.type=='nucleus') {
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
    if(this.type=='bullet') {
			context.beginPath();
			context.arc(this.x, this.y, this.diam/2, 0, 2 * Math.PI, false);
	    context.fillStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';   -   The object color
	    context.fill();
	    context.strokeStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';  - The line arround the object
	    context.stroke();
	  }
    if(this.type=='player') {
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
	  
	};
	this.clone = function() { return Object.assign({}, this); };
	
	this.collide = function(o2) {
		o1 = this;
		relative_vel_mag = Math.sqrt( Math.pow((o1.vel.x-o2.vel.x), 2) + Math.pow((o1.vel.y-o2.vel.y), 2) );
		dist = Math.sqrt( Math.pow((o1.x-o2.x), 2) + Math.pow((o1.y-o2.y), 2) );
		min_dist = o1.diam/2 + o2.diam/2;
		over_dist = min_dist-dist;
		dist_err = over_dist/min_dist;
    uN = new Victor((o2.x-o1.x), (o2.y-o1.y)).normalize();
    
		//COMBINE THESE 2 OBJECTS INTO o1, destroy o2
		if(this.collision_type=='merge')
		{
			//clone 'this' into o1 (so we don't change o1's original attributes just yet)
			var o1 = this.clone();
			//find center of mass  -  http://hyperphysics.phy-astr.gsu.edu/hbase/cm.html
			new_mass = (o1.mass+o2.mass);
			this.x = (o1.mass*o1.x + o2.mass*o2.x) / new_mass;
			this.y = (o1.mass*o1.y + o2.mass*o2.y) / new_mass;
			//find velocities (preserve momentum)
			total_momentum_i = (o1.mass*o1.vel.x + o2.mass*o2.vel.x);
			this.vel.x = total_momentum_i / new_mass;
			total_momentum_j = (o1.mass*o1.vel.y + o2.mass*o2.vel.y);
			this.vel.y = total_momentum_j / new_mass;
			this.mass = new_mass;
			this.density = o1.density;
			new_area = new_mass/o1.density;
			mew_diam = Math.sqrt((new_area/Math.PI))*2;
			this.set_diam(mew_diam);
			o1perc = o1.mass/this.mass;
			o2perc = o2.mass/this.mass;
			this.color.r = o1.color.r*o1perc + o2.color.r*o2perc;
			this.color.g = o1.color.g*o1perc + o2.color.g*o2perc;
			this.color.b = o1.color.b*o1perc + o2.color.b*o2perc;
			//DISABLE THE COLLIDING OBJECT
			o2.disabled=true;
		}
		if(this.collision_type=='bounce'){
			
			if(o1.type!='bullet' && o2.type!='bullet' && o1.type!='player' && o2.type!='player' && o2.type!='nucleus' && o1.type!='nucleus') {
				one_is_red = (o1.color.r>0 || o2.color.r>0);
				one_is_green = (o1.color.g>0 || o2.color.g>0);
				if(one_is_red && !one_is_green) { o1.color=o2.color={r:255, g:0, b:0}; }
				if(one_is_green && !one_is_red) { o1.color=o2.color={r:0, g:200, b:0}; }
				if(one_is_green && one_is_red) { o1.color=o2.color={r:0, g:0, b:255}; }
			}
			
			//roll back 1 full step to find accurate collision
			x1 = o1.x - o1.vel.x*step_size; y1 = o1.y - o1.vel.y*step_size;
			x2 = o2.x - o2.vel.x*step_size; y2 = o2.y - o2.vel.y*step_size;
			
			//if rolling back a full step won't help then forcibly move them apart on their normal vector (they're probably stuck on eachother)
			newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
			if(newdist < min_dist) { //they're still collided even after backing up a step
				console.log("pull appart : "+relative_vel_mag);
				o1_mass_perc = o1.mass/(o1.mass+o2.mass);
				o2_mass_perc = o2.mass/(o2.mass+o1.mass);
				//console.log("m1"+o1.mass+"("+o1_mass_perc+")   m2"+o2.mass+"("+o2_mass_perc+")");
				o1move = (o1.no_collision_movement? 0 : (o2.no_collision_movement? over_dist:over_dist*o2_mass_perc) );
		    o2move = (o2.no_collision_movement? 0 : (o1.no_collision_movement? over_dist:over_dist*o1_mass_perc) );
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
					resolution = 2;
					substep = step_size / resolution;
					while(true){
						scnt++;
						
						x1_last = x1; y1_last = y1;
						x2_last = x2; y2_last = y2;
	
						x1 += o1.vel.x*substep; y1 += o1.vel.y*substep;
						x2 += o2.vel.x*substep; y2 += o2.vel.y*substep;
						
						newdist = Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
	
						if(scnt>1000) { console.log('BREAK! Ran #'+scnt+' resolution:'+resolution + ' dist:'+newdist  ); break; }
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
			
			o1vel_V = new Victor(o1.vel.x, o1.vel.y);
			o1velN = o1vel_V.dot(uN); // component of o1 velocity in normal direction
			o1velT = o1vel_V.dot(uT); // component of o1 velocity in tangent direction
			
			o2vel_V = new Victor(o2.vel.x, o2.vel.y);
			o2velN = o2vel_V.dot(uN); // component of o2 velocity in normal direction
			o2velT = o2vel_V.dot(uT); // component of o2 velocity in tangent direction
			
			//objects already moving away from the collision?
			if(o1velN<=0 && o2velN>=0) return;
							
			//compute the new 1d velocity magnitude along the normal vector
			if(o1.no_collision_movement) { new_o1velN = o1velN; if(!o2.no_collision_movement){new_o2velN = o2velN*-1;} }
			else if(o2.no_collision_movement) { new_o2velN = o2velN; if(!o1.no_collision_movement){new_o1velN = o1velN*-1;} }
			else { //normal collision
				new_o1velN =  ( o1velN*(o1.mass-o2.mass) + 2*o2.mass*o2velN ) / (o1.mass + o2.mass);
				new_o2velN =  ( o2velN*(o2.mass-o1.mass) + 2*o1.mass*o1velN ) / (o1.mass + o2.mass);
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
			new_o1velN_V = new Victor(new_o1velN*uN.x,new_o1velN*uN.y);
			new_o2velN_V = new Victor(new_o2velN*uN.x,new_o2velN*uN.y);
			//get the velocity vectors (in tangent direction) - they haven't changed
			new_o1velT_V = new Victor(o1velT*uT.x,o1velT*uT.y);
			new_o2velT_V = new Victor(o2velT*uT.x,o2velT*uT.y);
			//new velocity vectors are sum of new Normal and Tangent Vectors
			new_o1vel_V = new_o1velN_V.add(new_o1velT_V);
			new_o2vel_V = new_o2velN_V.add(new_o2velT_V);
			//store back into our system
			
			if(!o1.no_collision_movement) {
				o1.vel.x = new_o1vel_V.x;
				o1.vel.y = new_o1vel_V.y;
			}
			if(!o2.no_collision_movement) {
				o2.vel.x = new_o2vel_V.x;
				o2.vel.y = new_o2vel_V.y;
			}
			

			/*console.log("NEW");
			console.log(new_o1vel_V);
			console.log(new_o2vel_V);
			console.log("NEW VEL");
			console.log('o1:' + o1.vel.x + ' ' + o1.vel.y);
			console.log('o2:' + o2.vel.x + ' ' + o2.vel.y);
			console.log(o1velN);
			console.log(o2velN);
			console.log(new_o1velN);
			console.log(new_o2velN);*/				
				
		}
	}; //end collision function
	
} //end xobj class
