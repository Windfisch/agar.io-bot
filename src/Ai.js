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

			var action=this.findBestAction(mergedOrganism,otherOrganisms,this.depth)

			this.actionCooldown--
			if (action&&(this.actionCooldown<1||action.myOrganism.size<action.otherOrganism.size*.85||action.myOrganism.src.length>1||action.otherOrganism.v)){
				
				if(action.myOrganism.size<action.otherOrganism.size*.85
					&&Math.pow(Math.pow(action.x-this.mapMidX,2)+Math.pow(action.y-this.mapMidY,2),.5)>(this.mapMaxX-this.mapMinX)/2
				){
					var angle=Math.atan2(action.y-this.mapMidY,action.x-this.mapMidX)
					
					action.ox=action.x
					action.oy=action.y
					action.x=Math.cos(angle)*this.mapMidX+this.mapMidX
					action.y=Math.sin(angle)*this.mapMidY+this.mapMidY
				}

				switch(action.type){
					case 'move':
						this.move(~~action.x,~~action.y)
					break;
					case 'split':
						this.move(~~action.x,~~action.y)
						Ai.prototype.allowSplit=false
						setTimeout(function(){Ai.prototype.allowSplit=true}.bind(this),this.splitCooldown)
						this.split()
					break;
					case 'shoot':
						this.move(~~action.x,~~action.y)
						Ai.prototype.allowShoot=false
						setTimeout(function(){Ai.prototype.allowShoot=true}.bind(this),this.shootCooldown)
						this.shoot()
					break;
				}
				
				if(!action.otherOrganism.v&&action.myOrganism.size*.85>action.otherOrganism.size){			
					this.actionCooldown=action.myOrganism.v?
							~~((Math.pow(
								Math.pow(action.myOrganism.nx-action.otherOrganism.nx,2)+Math.pow(action.myOrganism.ny-action.otherOrganism.ny,2),.5)-action.myOrganism.size)
							/action.myOrganism.v/2)
						:0
				}else{
					this.actionCooldown=0
				}	
				this.lastAction=action
			}

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
				var considerationWeights=this.actionGenerators
						.map(function(actionGenerator){
							return actionGenerator.considerations	
						})
						.reduce(function(a,b){
							return a.concat(b)
						})
						.map(function(consideration){
							return consideration.weight
						}),
					stat=new Stat(
						this.lastStateChangeDate,
						new Date,
						Math.max.apply(null,this.scoreHistory),
						considerationWeights)

				_gaq.push(['_trackEvent','bot','died','highest_score',stat.maxScore])
				_gaq.push(['_trackEvent','bot','died','score',this.scoreHistory[this.scoreHistory.length-1]])
				if(this.lastAction){
					var mOrganism=this.lastAction.myOrganism
					var oOrganism=this.lastAction.otherOrganism
					stat.lastActionOtherOrganismSize=this.lastAction.otherOrganism.size
					stat.lastActionOtherOrganismDist=Math.pow(Math.pow(mOrganism.nx-oOrganism.nx,2)+Math.pow(mOrganism.ny-oOrganism.ny,2),.5)
					stat.lastActionOtherOrganismPv=this.lastAction.otherOrganism.v
					stat.lastActionMyOrganismPv=this.lastAction.myOrganism.v
					stat.lastActionMyOrganismSize=this.lastAction.myOrganism.size
					stat.cushion=this.cushion
					stat.ping=this.pings[this.pings.length-1]
					stat.avgPing=this.avgPing

						//TODO maybe use max cushion instead of avg?
					if(
						mOrganism.size<oOrganism.size*.85
						&&oOrganism.size-oOrganism.cushion/2>stat.lastActionOtherOrganismDist	
					){

						var cushion=oOrganism.size-oOrganism.cushion/2-stat.lastActionOtherOrganismDist
						this.cushions.push(cushion)
						this.cushions=this.cushions.slice(this.cushions.length-400,this.cushions.length)
						Ai.prototype.cushion=this.cushions.reduce(function(a,b,i){return a+b*i})
							/(this.cushions
								.map(function(a,i){return i})
								.reduce(function(a,b){return a+b})+1)
					}
				}

				this.gameHistory.push(stat)

				var slicedGameHistory=this.gameHistory.slice(this.gameHistory.length-400>0?this.gameHistory.length-400:0,this.gameHistory.length)
				chrome.storage.local.set({
					gameHistory5:slicedGameHistory,
					exp:this.exp	
					}) 

				var weights=this.totalWeights
				for(var i=this.gameHistory.length-1;i<this.gameHistory.length;i++){
					var stat=this.gameHistory[i],
						totalWeight=stat.considerationWeights.reduce(function(a,b){return a+b})
					for(var j=0;j<stat.considerationWeights.length;j++){
						var weightedScore=Math.pow(2,Math.pow(stat.maxScore,.5)-100)
						this.totalWeightedScore+=weightedScore	
						weights[j]+=stat.considerationWeights[j]/totalWeight*weightedScore
					}
				}

				this.totalWeights=weights

				weights=[]

				if(this.allowIntuition){
					for(var i=0;i<this.totalWeights.length;i++){
						//weights[i]=Math.ceil(weights[i]/this.gameHistory.length)
						weights[i]=Math.ceil(this.totalWeights[i]/this.totalWeightedScore)
					}
					var avgWeight=weights.reduce(function(a,b){return a+b})/weights.length	
					for(var i=0;i<weights.length;i++){
						weights[i]+=Math.ceil(Math.random()*avgWeight*100/(this.gameHistory.length%2?1:this.gameHistory.length)+1)
					}
					var i=0;
					this.actionGenerators.forEach(function(actionGenerator){
						actionGenerator.considerations.forEach(function(consideration){
							consideration.weight=weights[i++]
						})
					})
				}
				this.onDeath()
				this.scoreHistory=[]
				this.lastStateChangeDate=new Date
			}
			this.currentState='dead'
		}
	},
	heatMapType:6,
	draw:function(ctx){
		var lastAction=this.lastAction
		miniMapCtx.clearRect(0,0,(ai.mapMaxX-ai.mapMinX)/64,(ai.mapMaxY-ai.mapMinY)/64)

		miniMapCtx.strokeStyle='rgb(52,152,219)'
		for(var i=0;i<this.otherOrganisms.length;i++){
			var otherOrganism=this.otherOrganisms[i]
			miniMapCtx.beginPath()
			miniMapCtx.arc((otherOrganism.nx-ai.mapMinX)/64,(otherOrganism.ny-ai.mapMinY)/64,otherOrganism.size/64,0,2*Math.PI)
			miniMapCtx.stroke()
		}

		if (lastAction){
			miniMapCtx.strokeStyle="#FFFFFF"
			miniMapCtx.beginPath()
			miniMapCtx.arc((lastAction.myOrganism.nx-ai.mapMinX)/64,(lastAction.myOrganism.ny-ai.mapMinY)/64,lastAction.myOrganism.size/64,0,2*Math.PI)
			miniMapCtx.stroke()
		}

		if(this.heatmapEnabled
			&&this.lastAction
			&&this.lastAction.myOrganism
			&&this.lastAction.myOrganism.src
			&&this.lastAction.myOrganism.src.length
		){
			var mOrganism=this.lastAction.myOrganism.src[0],
				size=~~mOrganism.size*2

			if ([3,4,9,11].indexOf(this.heatMapType)!=-1){
				for(var x=mOrganism.x-12*size;x<mOrganism.x+12*size;x+=size){
					for(var y=mOrganism.y-10*size;y<mOrganism.y+10*size;y+=size){
						var cOrganism=new Organism
						Object.keys(mOrganism).forEach(function(key){
							cOrganism[key]=mOrganism[key]
						})
						cOrganism.nx=x
						cOrganism.ny=y
						
						var value=Math.max.apply(null,this.otherOrganisms
								.filter(function(oOrganism){return this.considerations[this.heatMapType].filter(cOrganism,oOrganism,{type:'move'})},this)
								.map(function(oOrganism){
							return this.considerations[this.heatMapType].weightedCalc(cOrganism,oOrganism,{type:'move'},true)
						},this))/2
						if(value==Infinity){
							value=1
						}
						if(value>0){
							ctx.fillStyle='rgba(255,255,100,'+value+')'
							ctx.fillRect(x-~~(size/2),y-~~(size/2),size,size)
						}	
					}
				}
			}else if([0,1,2,8,10].indexOf(this.heatMapType)!=-1){
				this.otherOrganisms
					.filter(function(oOrganism){
						return this.considerations[this.heatMapType].filter(mOrganism,oOrganism,{type:'move'})
					},this)
					.forEach(function(oOrganism){
						var value=this.considerations[this.heatMapType].weightedCalc(mOrganism,oOrganism,{type:'move'},true)
						ctx.fillStyle='rgba(255,255,100,'+value+')'
						ctx.fillRect(oOrganism.nx-~~oOrganism.size*2,oOrganism.ny-~~oOrganism.size*2,oOrganism.size*4,oOrganism.size*4)
					},this)	
			}else if([6,7].indexOf(this.heatMapType)!=-1){
				for(var x=mOrganism.x-12*size;x<mOrganism.x+12*size;x+=size){
					for(var y=mOrganism.y-10*size;y<mOrganism.y+10*size;y+=size){
						var cOrganism=new Organism
						Object.keys(mOrganism).forEach(function(key){
							cOrganism[key]=mOrganism[key]
						})
						cOrganism.nx=x
						cOrganism.ny=y
					
						var value=this.considerations[this.heatMapType].weightedCalc({},cOrganism,{type:'move'},true)
						if(value==Infinity){
							value=1
						}
						if(value>0){
							ctx.fillStyle='rgba(255,255,100,'+value+')'
							ctx.fillRect(x-~~(size/2),y-~~(size/2),size,size)
						}	

					}
				}
				
			}
		}

		if(this.linesEnabled){
			var myOrganism
			ctx.lineCap='round'

			if(lastAction){
				if(lastAction.weightedValues[0]){
					ctx.lineWidth=1
					var consideration=lastAction.weightedValues[0][1]
					ctx.strokeStyle=consideration.color
					consideration.draw(ctx,lastAction.myOrganism,lastAction.otherOrganism)
				}
					
				if(lastAction.ox){
					ctx.beginPath()
					ctx.setLineDash([5])
					ctx.strokeStyle='rgb(180,180,180)'
					ctx.moveTo(lastAction.myOrganism.nx,lastAction.myOrganism.ny)
					ctx.lineTo(lastAction.ox,lastAction.oy)
					ctx.stroke()
					ctx.setLineDash([0])
				}
			}

			for(var j=2;j>=0;j-=2){
				lastAction=this.lastAction
				if(lastAction){
					ctx.lineWidth=this.badRing[j+1]
					ctx.strokeStyle=this.badRing[j+0]
					myOrganism=lastAction.myOrganism
					if(lastAction.srcActions){
						for(var i=0;i<lastAction.srcActions.length;i++){
							ctx.beginPath()
							ctx.arc(
								lastAction.srcActions[i].otherOrganism.nx,
								lastAction.srcActions[i].otherOrganism.ny,
								lastAction.srcActions[i].otherOrganism.size+~~lastAction.srcActions[i].otherOrganism.cushion,
								0,
								2*Math.PI
							)
							ctx.stroke()
						}

						ctx.lineWidth/=2
						for(var i=0;i<lastAction.srcActions.length;i++){
								ctx.beginPath()
								ctx.arc(
									lastAction.srcActions[i].otherOrganism.nx,
									lastAction.srcActions[i].otherOrganism.ny,
									lastAction.srcActions[i].otherOrganism.size,
									0,
									2*Math.PI
								)
								ctx.stroke()
	
							ctx.beginPath()
							ctx.moveTo(myOrganism.nx,myOrganism.ny)
							ctx.lineTo(lastAction.srcActions[i].otherOrganism.nx,lastAction.srcActions[i].otherOrganism.ny)
							ctx.stroke()
						}
					}else if(lastAction.otherOrganism.isVirus||lastAction.otherOrganism.size>myOrganism.size){
						ctx.beginPath()
						ctx.arc(lastAction.otherOrganism.nx,lastAction.otherOrganism.ny,lastAction.otherOrganism.size+~~lastAction.otherOrganism.cushion,0,2*Math.PI)
						ctx.stroke()
						
						ctx.lineWidth/=2
						ctx.beginPath()
						ctx.moveTo(myOrganism.nx,myOrganism.ny)
						ctx.lineTo(lastAction.otherOrganism.nx,lastAction.otherOrganism.ny)
						ctx.stroke()

						ctx.beginPath()
						ctx.arc(lastAction.otherOrganism.nx,lastAction.otherOrganism.ny,lastAction.otherOrganism.size,0,2*Math.PI)
						ctx.stroke()
					}
				
					ctx.strokeStyle=this.goodRing[j+0]
					ctx.lineWidth=this.goodRing[j+1]
					while(lastAction){
						myOrganism=lastAction.myOrganism
						ctx.beginPath()
						ctx.moveTo(myOrganism.nx,myOrganism.ny)
						ctx.lineTo(lastAction.x,lastAction.y)
						ctx.stroke()
						lastAction=lastAction.next
					}

					lastAction=this.lastAction
					ctx.strokeStyle=this.myRing[j+0]
					ctx.lineWidth=this.myRing[j+1]
					ctx.beginPath()

					if(lastAction.myOrganism.src.length==1){
						var organism=lastAction.myOrganism.src[0]
						ctx.arc(
							organism.x,
							organism.y,
							organism.size+~~lastAction.myOrganism.cushion,
							0,
							2*Math.PI)
					}else{
						ctx.arc(
							lastAction.myOrganism.nx,
							lastAction.myOrganism.ny,
							lastAction.myOrganism.size+~~lastAction.myOrganism.cushion,
							0,
							2*Math.PI)
					}
					ctx.stroke()
					
					ctx.lineWidth/=2
					ctx.beginPath()
					if(lastAction.myOrganism.src.length==1){
						var organism=lastAction.myOrganism.src[0]
						ctx.arc(
							organism.x,
							organism.y,
							organism.size,
							0,
							2*Math.PI)
					}else{
						ctx.arc(
							lastAction.myOrganism.nx,
							lastAction.myOrganism.ny,
							lastAction.myOrganism.size,
							0,
							2*Math.PI)
					}
					ctx.stroke()
				}
			}
		}
		this.onDraw()
	}
}







