
class Player extends Obj
{
  constructor(){
		super();
		this.type='player';
  }
	
  //player doesn't get drawn, he'll always be in a ship of some sort
	draw(){}
  
}