class Util 
{
	static rand(min,max)
	{
		var range = max-min+1;
		return Math.floor(Math.random() * range) + min;
	}
}

/**
	allow the code to be loaded in either the browser or nodejs
*/
typeof module=== 'undefined'? '': (function(exports){
   module.exports=xobj;
});

