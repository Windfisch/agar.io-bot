"use strict";
function Ai(move,split,shoot){
	this.move=move
	this.split=split
	this.shoot=shoot
}

Ai.prototype={
	mapMinX:-7071.067811865476,
	mapMinY:-7071.067811865476,
	mapMaxX:7071.067811865476,
	mapMaxY:7071.067811865476,
	get mapMidX(){
		return (this.mapMaxX-this.mapMinX)/2+this.mapMinX
	},
	get mapMidY(){
		return (this.mapMaxY-this.mapMinY)/2+this.mapMinY
	},
	score:0,
	exp:0,
	get lvl(){
		return ~~Math.pow(this.exp,.25)
	},
	get lvlPercent(){
		return ~~(
			(this.exp-Math.pow(this.lvl,4))
			/(Math.pow(this.lvl+1,4)-Math.pow(this.lvl,4))
			*100)
	},
	nicks:[],
	totalWeightedScore:0,
	cushions:[],
	pings:[],
	splitCooldown:10000,
	depth:3,
	onDraw:function(){},
	totalWeights:[],
	allowIntuition:false,
	lastActionBest5:[],
	cushion:0,
	heatmapEnabled:false,
	linesEnabled:true,
	lastAction:null,
	currentState:'',
	lastStateChangeDate:null,
	gameHistory:[],
	scoreHistory:[],
	myOrganisms:[],
	otherOrganisms:[],
	allowSplit:true,
	allowShoot:true,
	shootCooldown:5000,
	onDeath:function(){},
	myRing:['rgba(255,255,255,.95)',10,'rgba(53,255,255,.3)',20],
	badRing:['rgba(255,255,255,1)',4, 'rgba(231,76,60,.3)',20],
	goodRing:['rgba(255,255,255,.95)',2, 'rgba(12,227,172,.3)',10],
	otherRing:['rgba(255,255,255,.9)',1, 'rgba(12,227,172,.1)',2],
	actionCooldown:0,
	tick:function(organisms,myOrganisms,score){
		var otherOrganisms=this.otherOrganisms=organisms.filter(function(organism){
				organism.nx=organism.D
				organism.ny=organism.F
				organism.isVirus=organism.d
				
				if(!organism.onx){
					organism.onx=organism.nx
					organism.ony=organism.ny
				}

				organism.dx=organism.nx-organism.onx
				organism.dy=organism.ny-organism.ony
				organism.v=Math.pow(Math.pow(organism.dx,2)+Math.pow(organism.dy,2),.5)
				organism.cushion=organism.v*this.avgPing/40

				organism.onx=organism.nx
				organism.ony=organism.ny
				return myOrganisms.indexOf(organism)==-1
			},this)


		if(myOrganisms.length){
			var mergedOrganism=new Organism(),
				totalSize=myOrganisms
					.map(function(myOrganism){return myOrganism.size})
					.reduce(function(a,b){return a+b})
			mergedOrganism.src=myOrganisms

			Object.keys(Organism.prototype).forEach(function(key){
				var totalValue=myOrganisms
					.map(function(myOrganism){return myOrganism[key]*myOrganism.size})
					.reduce(function(a,b){return a+b})
				mergedOrganism[key]=totalValue/totalSize
			})

// 				switch(action.type){
// 					case 'move':
// 						this.move(~~action.x,~~action.y)
// 					break;
// 					case 'split':
// 						this.move(~~action.x,~~action.y)
// 						Ai.prototype.allowSplit=false
// 						setTimeout(function(){Ai.prototype.allowSplit=true}.bind(this),this.splitCooldown)
// 						this.split()
// 					break;
// 					case 'shoot':
// 						this.move(~~action.x,~~action.y)
// 						Ai.prototype.allowShoot=false
// 						setTimeout(function(){Ai.prototype.allowShoot=true}.bind(this),this.shootCooldown)
// 						this.shoot()
// 					break;
// 				}

			if (this.currentState!='alive'){

				this.lastStateChangeDate=new Date
				this.pings.push(Date.now()-startGameDate)

				_gaq.push(['_trackEvent', 'server', 'ping','start_game',this.pings[this.pings.length-1]]);
				this.pings=this.pings.slice(this.pings.length-400,this.pings.length)
				this.avgPing=this.pings.reduce(function(a,b,i){return a+b*Math.pow(2,i)})/(this.pings.map(function(a,i){return Math.pow(2,i)}).reduce(function(a,b){return a+b})+1)
			}
			this.scoreHistory.push(score)
			this.currentState='alive'
		}else{
			if(this.currentState=='alive'){
				//_gaq.push(['_trackEvent','bot','died','highest_score',stat.maxScore])
				//_gaq.push(['_trackEvent','bot','died','score',this.scoreHistory[this.scoreHistory.length-1]])

				this.onDeath()
				this.scoreHistory=[]
				this.lastStateChangeDate=new Date
			}
			this.currentState='dead'
		}
	},
	heatMapType:6,
	draw:function(ctx){
		this.onDraw()
	}
}







