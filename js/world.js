class World
{
  constructor(){
    this.start_time = Date.now();

    this.objarr = [];
    this.players = [];

    load_world_objects();

  }

  load_world_objects(){
    //ADD ALL OTHER OBJECTS
    for(var n=0; n<num_rand_planets; n++) {
    	obj = new Asteroid();
    	obj.mass=100;
    	obj.index = objarr.push(obj) - 1;
    }

    obj = new Ship();
    obj.type='player';
    obj.immobile=false;
    obj.x=xmax-100;
    obj.y=ymax-100;
    obj.mass = 100;
    obj.density = 0;
    obj.color = {r:0, g:100, b:200};
    obj.diam = 20;
    obj.index = objarr.push(obj) - 1;
    player1_obj = objarr[obj.index];
    this.players.push(obj.index);
  }

  function start_sim() {
  	//init

  	//DRAW START CONDITIONS
  	sim_draw();
  	//DRAW ALL
  	run_sim_step_loop();
  }

  function run_sim_step_loop() {
  	step_cnt++;
  	full_cnt++;
  	setTimeout(function(){
  		if(game_state=='play') {
  			if(!sim_step()) return false;
  			if(step_cnt%draw_once_per_n_steps==0) {
  				step_cnt=0;
  				frame_cnt++; if(frame_cnt_timer<Date.now()) { frame_cnt_per_second = frame_cnt; frame_cnt=0; frame_cnt_timer = Date.now()+1000;  }
  				if(!sim_draw()) return false;
  			}
  		}
      run_sim_step_loop();
  	}, loop_time_ms);
  }

  function sim_step() {

  	//APPLY MOVEMENT FORCES TO PLAYERS
  	for(var i=0; i<players.length; i++) {
  		oid = players[i];
  		pobj = objarr[oid];

  		if(keystate[LEFTKEY]) pobj.rot.rotate(-1*ROTATE_SPEED*step_size);
  		if(keystate[RIGHTKEY]) pobj.rot.rotate(1*ROTATE_SPEED*step_size);
  		if(keystate[UPKEY]) { pobj.vel.x += pobj.rot.x*FORWARD_ACCEL*step_size; pobj.vel.y += pobj.rot.y*FORWARD_ACCEL*step_size; }
  		if(keystate[DOWNKEY]) {

  			if(!pobj.last_fire_time || pobj.last_fire_time<(Date.now()-RATE_OF_FIRE_MS)) {
  				pobj.last_fire_time = Date.now();
  				obj = new Bullet();
  				obj.x = pobj.x + pobj.rot.x*(pobj.diam+10);
  				obj.y = pobj.y + pobj.rot.y*(pobj.diam+10);
  				obj.vel.x = pobj.vel.x + pobj.rot.x*BULLET_SPEED;
  				obj.vel.y = pobj.vel.y + pobj.rot.y*BULLET_SPEED;
  				objarr.push(obj);

  				//accelerate backwards
  				pobj.vel.x -= pobj.rot.x * BAKUP_SPEED;
  				pobj.vel.y -= pobj.rot.y * BAKUP_SPEED;
  			}
  		}

  	}


  	//APPLY FORCES TO RECALCULATE VELOCITY VECTORS

  	//PERFORM COLLISSIONS AND CLEANUP
  	for(var i=0; i<objarr.length; i++)
  	{
  		p1 = objarr[i];
  		if(!p1 || p1.disabled) continue; //this object no longer exists
  		if(p1.type=='bullet' && (Math.abs(p1.vel.x)+Math.abs(p1.vel.y)) < BULLET_SPEED*.8) { delete(objarr[i]); continue; }

  		for(var j=i+1; j<objarr.length; j++)
  		{
  			p2 = objarr[j];
  			if(!p2 || p2.disabled) continue; //this object no longer exists
  			if(p1.type=='bullet' && p2.type=='bullet') continue; //they're both bullets

  			//remove old/slow bullets (they also get removed if they leave the screen)
  			if(p2.type=='bullet' && (Math.abs(p2.vel.x)+Math.abs(p2.vel.y)) < BULLET_SPEED*.8) { delete(objarr[j]); continue; }

  			dist = Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2) );
  			min_dist = p1.diam/2 + p2.diam/2; //objects can't possibly be closer than this
  			use_dist = dist<min_dist? min_dist:dist;
  			is_touching = ((dist - (p1.diam/2) - (p2.diam/2)) <= 0);

  			//PERFORM COLLISION
  			if(!p1.no_collision && !p2.no_collision) {
  				if(is_touching) {
  					p1.collide(p2);
  				}
  			} //END COLLISION CODE
  		}
  	}

  	//APPLY GRAVITY & OTHHER FORCES
  	for(var i=0; i<objarr.length; i++)
  	{
  		p1 = objarr[i];
  		if(!p1 || p1.disabled) continue; //this object no longer exists
  		for(var j=i+1; j<objarr.length; j++)
  		{
  			p2 = objarr[j];
  			if(!p2 || p2.disabled) continue; //this object no longer exists
  			if(p1.type=='bullet' && p2.type=='bullet') continue; //they're both bullets

  			dist = Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2) );
  			min_dist = p1.diam/2 + p2.diam/2; //objects can't possibly be closer than this
  			use_dist = dist<min_dist? min_dist:dist;
  			is_touching = ((dist - (p1.diam/2) - (p2.diam/2)) <= 0);

  			//COMPUTE UNIT VECTORS (from each object's center of mass)
  			uvect_i = (p2.x-p1.x)/dist; //unit vector in direction of pull
  			uvect_j = (p2.y-p1.y)/dist;

  			//CALCULATE GRAVITY FORCES
  			if(p1.no_gravity || p2.no_gravity) grav_force=0;
  			else { grav_force = grav_const*p2.mass*p1.mass / Math.pow(use_dist,2); }

  			if(!p1.immobile) {
  				total_force = (p1.no_gravity_movement? 0:grav_force);
  				p1.vel.x += (uvect_i*total_force) / p1.mass * step_size;
  				p1.vel.y += (uvect_j*total_force) / p1.mass * step_size;
  			}
  			if(!p2.immobile) {
  				total_force = (p2.no_gravity_movement? 0:grav_force);
  				//if(Math.abs(total_force) > .00001) {
  				p2.vel.x -= (uvect_i*total_force) / p2.mass * step_size;
  				p2.vel.y -= (uvect_j*total_force) / p2.mass * step_size;
  				//}
  			}
  		} //END J LOOP
  	}//END I LOOP



  	//ADVANCE EACH POINT
  	for(var i=0; i<objarr.length; i++) {
  		p = objarr[i];
  		if(!p || p.disabled) continue; //this point no longer exists
  		//update object position based on current velocity
  		p.x+=p.vel.x * step_size;
  		p.y+=p.vel.y * step_size;
  		if(do_edge_bounce) {
  			out_of_bounds = (p.x>level_edge.x || p.x<-level_edge.x || p.y>level_edge.y || p.y<-level_edge.y);
  			if(p.type=='bullet' && out_of_bounds) delete(objarr[i]);
  			if(out_of_bounds) {
  				if(p.x>level_edge.x) { p.x=level_edge.x; p.vel.x*=-1; }
  				if(p.x<-level_edge.x) { p.x=-level_edge.x; p.vel.x*=-1; }
  				if(p.y>level_edge.y) { p.y=level_edge.y; p.vel.y*=-1; }
  				if(p.y<-level_edge.y) { p.y=-level_edge.y; p.vel.y*=-1; }
  			}
  		}
  	}

  	return true;
  }

  function sim_draw() {
  	//scroll to new player position
  	//var wrapper = document.getElementById('canvasWrapper');
  	screen_pos_x = player1_obj.x - Math.round(xmax/2);
  	screen_pos_y = player1_obj.y - Math.round(ymax/2);
  	//wrapper.scrollTop = player1_obj.x - Math.round(xmax/2);
  	//wrapper.scrollLeft = player1_obj.y - Math.round(ymax/2);

  	//save the default transformation matrix
  	context.save(); //push()

  	//CLEAR OLD
  	if(clear_each_frame) context.clearRect(0, 0, canvas.width, canvas.height);
  	if(fade_each_frame) {
  		context.fillStyle = '#FFFFFF';
  		context.fillStyle = 'rgba(255,255,255,0.01)';
  		context.shadowColor = '#FFFFFF';
  		context.fillRect(0, 0, canvas.width, canvas.height);
  		context.stroke();
  	}

  	//TRANSLATE BY USER POSIITON
  	context.translate(-screen_pos_x, -screen_pos_y);


  	//DRAW EDGE OF LEVEL
  	context.beginPath();
  	context.lineWidth="6";
  	context.rect(-level_edge.x, -level_edge.y, level_edge.x*2, level_edge.y*2);
    context.strokeStyle = 'rgb('+100+','+100+','+100+')';//'#000000';  - The line arround the object
    context.stroke();


  	//DRAW EACH OBJECT
  	for(var i=0; i<objarr.length; i++) {
  		//DRAW EACH POINT
  		obj = objarr[i];
  		if(!obj || obj.disabled) continue; //this point no longer exists
  		obj.draw();
  	}

  	context.restore(); //pop()


  	//SHOW COORDINATES
  	if(cursor_show_coordinates) {
  	  context.font = '10pt Calibri';
  	  context.fillStyle = '#000';
  	  context.fillText(canvas_mouse_pos.x + ',' + canvas_mouse_pos.y, 10, 20);
  	  context.fillText( Math.round((Date.now()-start_time)/1000.00) + " (Real Time)", 10, 40);
  	  context.fillText( Math.round(full_cnt*step_size) + "(Sim Time)", 10, 60);
  	  context.fillText( frame_cnt_per_second + " FPS", 10, 80);
  	}


  	return true;
  }
}
