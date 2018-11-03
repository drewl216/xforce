
class Obj
{
	constructor()
	{
		this.id = 0;

		this.x = Util.rand(0,xmax*2/3)+xmax/6;
		this.y = Util.rand(0,ymax*2/3)+ymax/6;

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

	/**
		convert the object to JSON string
		@Return json representation of this object
	*/
	toJson()
	{
		return JSON.stringify(this);
	}


	/**
		create from a json version
		@param string json_str a json encoded xobj
	*/
	static fromJson(json_str)
	{
		var object_parsed = JSON.parse(json_str);
		var obj = new xobj();
		for (var prop in object_parsed) {
			if (obj.hasOwnProperty(prop)) {
			obj[prop] = object_parsed[prop];}
		}
		return obj;
	}


} //end xobj class

/**
	allow the code to be loaded in either the browser or nodejs
*/
typeof module=== 'undefined'? '': (function(exports){
   module.exports=xobj;
});
