
class Ship extends Obj
{
  constructor(){
		super();
		this.shiptype = 'pod';
		this.thrust = 100;
		this.rot_speed = 0;
		this.equipped = [0]  //(array) 
		this.max_speed = 1000;
		this.max_occupants = 1;
		this.pilot_id = 0;
		this.can_control = 1;
		this.damage_impact = 0; //- reduces effectiveness of components
		this.dockable = 1;
		this.control_scheme = 'rotational'; //- Method of movement (rotational or directional)
		this.value = 0;  //cost to the team
		this.Description = "No description provided.";
		this.scanner_range = 400;
		this.shield_max = 100;
		this.shield = 100;
		this.shield_regen = .01;
		this.armor = 1;
		this.health = 100;
		this.health_max = 100;
		this.type='ship';
  }

	
	collision_check(collision,o2) {}
	collision_computed(collision,o2) {}
	collision_applied(collision,o2) {
		var o1 = this;
		//Compute Damage to Ships //JAL
		
		var damage = collision.computed_energy/1000;
		if(damage < 0) {damage = 0};
		//reduce shields		
		if(damage>0 && o1.shield>0) {
			if(damage < o1.shield) { o1.shield-=damage; damage=0; }
			else { damage-=o1.shield; o1.shield=0; }
		}
		
		//reduce health
		if(damage>0) {
			if(damage < o1.health) { o1.health-=damage; damage=0; }
			else {
				o1.kill();
			}
		}
	}



  draw()
	{
  	var shield_perc = (this.shield/this.shield_max);
  	var health_perc = (this.health/this.health_max);

    context.save(); // saves the coordinate system
        
    context.translate(this.x,this.y); // now the position (0,0) is found at (250,50)


		//draw the health bar (don't rotate it with the ship)
 		if(!this.drawtimer || this.last_drawn_health!=health_perc || this.drawtimer!='done' )
 		{
 			//restart the timer?
			if(!this.drawtimer || this.last_drawn_health!=health_perc) {  this.last_drawn_health = health_perc; this.drawtimer = Date.now(); }
	 		//times up?
			else if(this.drawtimer!='done' && Date.now()-this.drawtimer>3000) this.drawtimer='done'; 

			context.beginPath();
			context.moveTo(-this.diam/2 + (this.diam*(1-health_perc)), -this.diam/2-4);
	    context.lineTo(this.diam/2, -this.diam/2-4);
	    context.lineWidth = 2;
	    var color = this.get_health_color(health_perc);
	    context.strokeStyle = 'rgb('+color.r+','+color.g+','+color.b+')';//'#000000';  - The line arround the object
	    context.stroke();
	  }
    


    context.rotate(this.rot.angle() + Math.PI/2.0);  // rotate around the start point of your line

    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(7, 7);
    context.lineTo(-7, 7);
    context.lineWidth = 1;
    context.strokeStyle = 'rgb(150,150,150)';//'#000000';  - The line arround the object
    context.fillStyle = 'rgb('+Math.round(this.color.r)+','+Math.round(this.color.g)+','+Math.round(this.color.b)+')';//'#000000';  - The line arround the object
    context.fill();
    context.stroke();

    context.beginPath();
    context.moveTo(0, -100);
    context.lineTo(0, -106);
    context.moveTo(-3, -103);
    context.lineTo(3, -103);
    context.stroke();

    //draw shield circle
		context.beginPath();
    context.arc(0,0, this.diam/2, 0, 2 * Math.PI, false);
    context.lineWidth = 2*shield_perc;
    var rgb = Math.round(255*shield_perc);
    context.strokeStyle = 'rgb('+rgb+','+rgb+','+rgb+')';//'#000000';  - The line arround the object
    context.stroke();
		
		
    

    context.restore(); // restores the coordinate system back to (0,0)
  }
  
  
  kill() {
	var i = this.id;
	this.disabled=true;
	
	
  }
}
