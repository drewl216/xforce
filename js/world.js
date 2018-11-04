class World
{
  constructor(){
    this.objarr = [];
    this.players = [];

    this.load_world_objects();
	this.image = "/images/bg/star_bg.jpg";
	// this.this.objarray = []
	//this.playstartpos = []
	this.player_qty = 2;
	this.win_condition = "kills"; //(kills, elimination, points, capture, base_destroy)
	this.win_limit = 5;
	this.respawn_timer = 5000; //ms
	// this.this.players =
	//this.teams=


  }

  load_world_objects(){
    //ADD ALL OTHER OBJECTS
    for(var n=0; n<num_rand_planets; n++) {
    	var obj = new Asteroid();
    	obj.positionRandomly(-level_edge.x,-level_edge.y,level_edge.x,level_edge.y);
    	obj.index = this.objarr.push(obj) - 1;
    }

    var obj = new Ship();
    obj.type='player';
    obj.immobile=false;
    obj.positionRandomly(-level_edge.x,-level_edge.y,level_edge.x,level_edge.y);
    obj.mass = 100;
    obj.density = 0;
    obj.color = {r:0, g:100, b:200};
    obj.diam = 20;
    obj.index = this.objarr.push(obj) - 1;
    this.player1_obj = this.objarr[obj.index];
    this.players.push(obj.index);


  }

  start_sim() {
  	this.sim_draw();
  	this.run_sim_step_loop();
  }

  run_sim_step_loop() {
    step_cnt++;
  	full_cnt++;
  	setTimeout(function(parent_this){
  		if(game_state=='play') {
  			if(!parent_this.sim_step()) return false;
  			if(step_cnt%draw_once_per_n_steps==0) {
  				step_cnt=0;
  				frame_cnt++; if(frame_cnt_timer<Date.now()) { frame_cnt_per_second = frame_cnt; frame_cnt=0; frame_cnt_timer = Date.now()+1000;  }
  				if(!parent_this.sim_draw()) return false;
  			}
  		}
      parent_this.run_sim_step_loop();
  	}, loop_time_ms, this);
  }

  sim_step() {
    //APPLY MOVEMENT FORCES TO this.players
  	for(var i=0; i<this.players.length; i++) {
  		var oid = this.players[i];
  		var pobj = this.objarr[oid];
  		if(pobj.control_scheme=="directional"){
  			if(keystate[LEFTKEY]) pobj.vel.x -= FORWARD_ACCEL*step_size;
  			if(keystate[RIGHTKEY]) pobj.vel.x += FORWARD_ACCEL*step_size;
  			if(keystate[UPKEY]) { pobj.vel.y -= FORWARD_ACCEL*step_size; }
  			if(keystate[DOWNKEY]) { pobj.vel.y += FORWARD_ACCEL*step_size; }
  			if(keystate[FIREKEY]) {

  				if(!pobj.last_fire_time || pobj.last_fire_time<(Date.now()-RATE_OF_FIRE_MS)) {
  					pobj.last_fire_time = Date.now();
  					var obj = new Projectile();
  					var vect = new Victor(pobj.vel.x, pobj.vel.y);
  					vect.norm();
  					obj.x = pobj.x + obj.diam*vect.x;
  					obj.y = pobj.y+ obj.diam*vect.y;
  					obj.vel.x = pobj.vel.x + BULLET_SPEED*vect.x;
  					obj.vel.y = pobj.vel.y + BULLET_SPEED*vect.y;
  					this.objarr.push(obj);
  					snd_bloip.play();
  				}
  			}
  		}
  		else {
  			if(keystate[LEFTKEY]) pobj.rot.rotate(-1*ROTATE_SPEED*step_size);
  			if(keystate[RIGHTKEY]) pobj.rot.rotate(1*ROTATE_SPEED*step_size);
  			if(keystate[UPKEY]) { pobj.vel.x += pobj.rot.x*FORWARD_ACCEL*step_size; pobj.vel.y += pobj.rot.y*FORWARD_ACCEL*step_size; }
  			if(keystate[DOWNKEY]) { pobj.vel.x += pobj.rot.x*-1*FORWARD_ACCEL*step_size; pobj.vel.y += pobj.rot.y*-1*FORWARD_ACCEL*step_size; }
  			if(keystate[FIREKEY]) {

  				if(!pobj.last_fire_time || pobj.last_fire_time<(Date.now()-RATE_OF_FIRE_MS)) {
  					pobj.last_fire_time = Date.now();
  				  var obj = new Projectile();
  					obj.x = pobj.x + pobj.rot.x*(pobj.diam+10);
  					obj.y = pobj.y + pobj.rot.y*(pobj.diam+10);
  					obj.vel.x = pobj.vel.x + pobj.rot.x*BULLET_SPEED;
  					obj.vel.y = pobj.vel.y + pobj.rot.y*BULLET_SPEED;
  					this.objarr.push(obj);
  					snd_bloip.play();

  					//accelerate backwards
  					pobj.vel.x -= pobj.rot.x * BAKUP_SPEED;
  					pobj.vel.y -= pobj.rot.y * BAKUP_SPEED;
  				}
  			}
  		}
  	}


  	//APPLY FORCES TO RECALCULATE VELOCITY VECTORS

  	//PERFORM COLLISSIONS AND CLEANUP
  	for(var i=0; i<this.objarr.length; i++)
  	{
  		var p1 = this.objarr[i];
  		if(!p1 || p1.disabled) continue; //this object no longer exists
  //		if(p1.type=='bullet' && (Math.abs(p1.vel.x)+Math.abs(p1.vel.y)) < BULLET_SPEED*.8) { delete(this.objarr[i]); continue; }

  		for(var j=i+1; j<this.objarr.length; j++)
  		{
  			var p2 = this.objarr[j];
  			if(!p2 || p2.disabled) continue; //this object no longer exists
  			if(p1.type=='bullet' && p2.type=='bullet') continue; //they're both bullets

  			//remove old/slow bullets (they also get removed if they leave the screen)
  //		if(p2.type=='bullet' && (Math.abs(p2.vel.x)+Math.abs(p2.vel.y)) < BULLET_SPEED*.8) { delete(this.objarr[j]); continue; }

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
  	for(var i=0; i<this.objarr.length; i++)
  	{
  		var p1 = this.objarr[i];
  		if(!p1 || p1.disabled) continue; //this object no longer exists
  		for(var j=i+1; j<this.objarr.length; j++)
  		{
  			var p2 = this.objarr[j];
  			if(!p2 || p2.disabled) continue; //this object no longer exists
  			if(p1.type=='bullet' && p2.type=='bullet') continue; //they're both bullets

  			var dist = Math.sqrt( Math.pow((p1.x-p2.x), 2) + Math.pow((p1.y-p2.y), 2) );
  			var min_dist = p1.diam/2 + p2.diam/2; //objects can't possibly be closer than this
  			var use_dist = dist<min_dist? min_dist:dist;
  			var is_touching = ((dist - (p1.diam/2) - (p2.diam/2)) <= 0);

  			//COMPUTE UNIT VECTORS (from each object's center of mass)
  			var uvect_i = (p2.x-p1.x)/dist; //unit vector in direction of pull
  			var uvect_j = (p2.y-p1.y)/dist;

  			//CALCULATE GRAVITY FORCES
        var grav_force = 0;
  			if(p1.no_gravity || p2.no_gravity) grav_force=0;
  			else { grav_force = grav_const*p2.mass*p1.mass / Math.pow(use_dist,2); }

  			if(!p1.immobile) {
  				var total_force = (p1.no_gravity_movement? 0:grav_force);
  				p1.vel.x += (uvect_i*total_force) / p1.mass * step_size;
  				p1.vel.y += (uvect_j*total_force) / p1.mass * step_size;
  			}
  			if(!p2.immobile) {
  				var total_force = (p2.no_gravity_movement? 0:grav_force);
  				//if(Math.abs(total_force) > .00001) {
  				p2.vel.x -= (uvect_i*total_force) / p2.mass * step_size;
  				p2.vel.y -= (uvect_j*total_force) / p2.mass * step_size;
  				//}
  			}
  		} //END J LOOP
  	}//END I LOOP



  	//ADVANCE EACH POINT
  	for(var i=0; i<this.objarr.length; i++) {
  		var p = this.objarr[i];
  		if(!p || p.disabled) continue; //this point no longer exists
  		//update object position based on current velocity
  		p.x+=p.vel.x * step_size;
  		p.y+=p.vel.y * step_size;
  		if(do_edge_bounce) {
  			var out_of_bounds = (p.x>level_edge.x || p.x<-level_edge.x || p.y>level_edge.y || p.y<-level_edge.y);
  			if(p.type=='bullet' && out_of_bounds) delete(this.objarr[i]);
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

  sim_draw() {
    //scroll to new player position
  	//var wrapper = document.getElementById('canvasWrapper');
  	var screen_pos_x = this.player1_obj.x - Math.round(xmax/2);
  	var screen_pos_y = this.player1_obj.y - Math.round(ymax/2);
  	var screen_max_x = screen_pos_x + xmax;
  	var screen_max_y = screen_pos_y + ymax;
  	//wrapper.scrollTop = this.player1_obj.x - Math.round(xmax/2);
  	//wrapper.scrollLeft = this.player1_obj.y - Math.round(ymax/2);

  	//CLEAR OLD
  	if(clear_each_frame) context.clearRect(0, 0, canvas.width, canvas.height);
  	if(fade_each_frame) {
  		context.fillStyle = '#FFFFFF';
  		context.fillStyle = 'rgba(255,255,255,0.01)';
  		context.shadowColor = '#FFFFFF';
  		context.fillRect(0, 0, canvas.width, canvas.height);
  		context.stroke();
  	}	//save the default transformation matrix


  	//DRAW BACKGROUND
  	context.save(); //push()
  	//TRANSLATE BY USER POSIITON
  	var level_width_plus_half_screen = 2*level_edge.x-(.5*canvas.width);
  	var level_height_plus_half_screen = 2*level_edge.y-(.5*canvas.height);
  	//percent_x =
  	context.translate(-screen_pos_x, -screen_pos_y);
  	context.drawImage(background,-level_edge.x-(.5*canvas.width),-level_edge.y-(.5*canvas.height), level_edge.x*2+canvas.width,level_edge.y*2+canvas.height);
  	context.restore(); //pop()


  	context.save(); //push()

  	//TRANSLATE BY USER POSIITON
  	context.translate(-screen_pos_x, -screen_pos_y);


  	//DRAW EDGE OF LEVEL
  	context.beginPath();
  	context.lineWidth="6";
  	context.rect(-level_edge.x, -level_edge.y, level_edge.x*2, level_edge.y*2);
   context.strokeStyle = 'rgb('+100+','+100+','+100+')';//'#000000';  - The line arround the object
    context.stroke();
    //reset line width to 1
context.lineWidth="1";





  	//DRAW EACH OBJECT
  	for(var i=0; i<this.objarr.length; i++) {
  		//DRAW EACH POINT
  		var obj = this.objarr[i];
  		if(!obj || obj.disabled) continue; //this point no longer exists
  		var objright = obj.x+obj.diam/2;
  		var objleft = obj.x-obj.diam/2;
  		var objtop = obj.y-obj.diam/2;
  		var objbot = obj.y+obj.diam/2;
  		if(objright<screen_pos_x || objleft > screen_max_x || objtop>screen_max_y || objbot < screen_pos_y) continue; //if the objects are outside the visible screen don't draw them.
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
