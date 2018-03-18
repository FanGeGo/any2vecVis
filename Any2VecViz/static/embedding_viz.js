var labels_visible = false;

var defaultRadius = 5;
var minRadius = 2;
var maxRadius = 25;

var defaultFontSize = '0.75em';

var colorScale = d3.scaleOrdinal(d3['schemeCategory10']);
var currentColor = 0;

function toggleLabels() {
	var label_state = labels_visible ? 'hidden' : 'visible';
	var node_state = labels_visible ? 'visible' : 'hidden';
	d3.selectAll('.label').style('visibility', label_state);
	d3.selectAll('.node').style('visibility', node_state);
	labels_visible = !labels_visible;
}

function draw_embedding(
	data,
	xmin,
	xmax,
	ymin,
	ymax
) {

// set svg to full screen
var width = window.innerWidth - 22;
var height = window.innerHeight - 22;
var svg = d3.select("svg#map").attr('width', width).attr('height', height);

var zoom = d3.zoom()
    .scaleExtent([1, 100])
    .translateExtent([[-100, -100], [width + 90, height + 100]])
    .on("zoom", zoomed);

var x = d3.scaleLinear()
    .domain([xmin, xmax])
    .range([-1, width + 1]);

var y = d3.scaleLinear()
    .domain([ymin, ymax])
    .range([-1, height + 1]);

var rankScale = d3.scaleLog()
	.domain([1, data.length + 1])
	.range([maxRadius, minRadius]);

var minTokenCount = Math.min.apply(Math,data.map(function(o){return o.count;}));
var maxTokenCount = Math.max.apply(Math,data.map(function(o){return o.count;}));

var countScale = d3.scaleLog()
	.domain([minTokenCount, maxTokenCount])
	.range([minRadius, maxRadius]);

var view = svg.append("rect")
    .attr("class", "view")
    .attr("x", 0.5)
    .attr("y", 0.5)
    .attr("width", width - 1)
    .attr("height", height - 1);

var points = svg.selectAll('circle')
  .data(data)
  .enter();
  
  points
  .append("circle")
  .classed('node', true)
  .attr('r', defaultRadius)
  .attr('cx', function (d) {return x(d.x);})
  .attr('cy', function (d) {return y(d.y);})
  .on('click', function(d) {onTokenClick(d);})
  .append('svg:title')
  .text(function (d) {return d.label;});
  
  points
  .append("text")
  .classed('label', true)
  .attr('x', function (d) {return x(d.x);})
  .attr('y', function (d) {return y(d.y);})
  .on('click', function(d) {onTokenClick(d);})
  .text(function (d) {return d.label;})
  .append('svg:title')
  .text(function (d) {return d.label;});
  
d3.select("#reset")
    .on("click", resetted);

d3.select("#clear")
    .on("click", clearSelection);

d3.select("#query_input")
	.on("search", queryToken);

d3.selectAll("input[name=nodeSize]")
	.on("change", changeNodeSize);

svg.call(zoom);

function zoomed() {
  view.attr("transform", d3.event.transform);
  
  svg.selectAll('.node')
  .data(data)
  .attr('cx', function(d) {return d3.event.transform.rescaleX(x)(d.x);})
  .attr('cy', function(d) {return d3.event.transform.rescaleY(y)(d.y);});
  
  svg.selectAll('.label')
  .data(data)
  .attr('x', function(d) {return d3.event.transform.rescaleX(x)(d.x);})
  .attr('y', function(d) {return d3.event.transform.rescaleY(y)(d.y);});
}

function resetted() {
  clearSelection();
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

function clearQuerySelection() {
  svg.selectAll('.node.queried')
  	.attr('r', defaultRadius)
  	.style('fill', '#BBB')
  	.classed('queried', false);

  svg.selectAll('.label.queried')
	.style('font-size', defaultFontSize)
	.style('fill', '#000')
	.classed('queried', false);
}

function clearSelection() {
  clearQuerySelection();
  clearSimilarities();
  svg.selectAll('.node').style('fill', '#BBB').classed('selected', false);
  svg.selectAll('.label').style('fill', '#000').classed('selected', false);
  d3.selectAll('#clusters span').remove();
  d3.select('#query_input').node().value = '';
}

function clearSimilarities() {
  d3.select('#similarities h3').remove();
  d3.selectAll('#similarities svg *').remove();
}

function onTokenClick(token) {
  highlight(token);
  showSimilarities(token);
  currentColor = (currentColor + 1) % 10;
}

function highlight(token) {
  var node_selection = svg.selectAll('.node')
  .data(data)
  .filter(function(d) {return d.cluster == token.cluster;});
  
  node_selection.style('fill', colorScale(currentColor)).classed('selected', true);
  
  svg.selectAll('.label')
  .data(data)
  .filter(function(d) {return d.cluster == token.cluster;})
  .style('fill', colorScale(currentColor))
  .classed('selected', true);
  
  d3.select("#clusters")
    .append('span')
    .text(token.label + ' (#' + token.cluster + ', n = ' + node_selection.size() + ')').style('color', colorScale(currentColor))
    .append('br');
}

function showSimilarities(token) {	
	var heading = d3.select('#similarities')
	  .selectAll('h3')
	  .data([token]);
	
	heading  
	  .enter()
	  .insert('h3', ':first-child')
	  .classed('sim-heading', true)
	  .merge(heading)
	  .text(token.label + ' (#' + token.rank + ': ' + token.count +')')
	  .style('color', colorScale(currentColor));
	  
	var sim_svg = d3.select("#similarities > svg");
	var width = sim_svg.node().getBoundingClientRect().width;
	var barHeight = 10;

	sim_svg.attr('height', (barHeight + 2) * token.similarities.length);
	
	var sim_bars = sim_svg 
	  .selectAll('g')
	  .data(token.similarities, function(d) {return d.other_token;});

	sim_bars.exit().remove();
	var bars = sim_bars.enter()
	  .append('g')
	  .attr('transform', function(d,i) {return 'translate(0,' + ((barHeight + 2) * i) + ')';});
	
	bars.append('rect')
	  .attr('width', function(d) {return d.similarity * 0.5 * width;})
	  .attr('height', barHeight)
	  .attr('x', 0.5 * width)
	  .style('fill', colorScale(currentColor));

	bars.append('text')
	  .classed('sim-label', true)
	  .on('click', function(d) {
	      clearQuerySelection();
	      highlightNodes(d.other_token, false);
	    })
	  .attr('x', 0.5 * width - 3)
	  .attr('y', 0.5 * barHeight)
	  .text(function (d) {return d.other_token;})
	  .style('fill', colorScale(currentColor));

	bars.append('text')
	  .classed('sim-text', true)
	  .attr('x', function(d) {return width - (0.5 * width * (1 - d.similarity)) - 2;})
	  .attr('y', 0.5 * barHeight)
	  .text(function (d) {return d.similarity.toFixed(3);});
}

function changeNodeSize() {
	var size_option = d3.select('input[name=nodeSize]:checked').node().value;
	svg.selectAll('.node')
      .transition()
      .duration(500)
      .attr('r', function(d) {
        var radius = defaultRadius;
       	if (size_option === "rank") {
        	  radius = rankScale(d.rank + 1);
        	} else if (size_option === "count") {
        	  radius = countScale(d.count);
        	}
        	return radius;
      });
}

function queryToken() {
	clearQuerySelection();
	var token = d3.select('#query_input').node().value;
	highlightNodes(token, true);
}

function highlightNodes(label, contains) {
	svg.selectAll('.node')
      .filter(function(d) {return contains ? d.label.includes(label) : d.label == label;})
      .classed('queried', true)
      .transition()
      .duration(500)
      .attr('r', 20)
      .style('fill', 'blue')
      .transition()
      .duration(750)
      .attr('r', 10)
      .style('fill', 'red');     

	svg.selectAll('.label')
    .filter(function(d) {return contains ? d.label.includes(label) : d.label == label;})
    .classed('queried', true)
    .transition()
    .duration(500)
    .style('font-size', '2em')
    .style('fill', 'blue')
    .transition()
    .duration(750)
    .style('font-size', '1.25em')
    .style('fill', 'red');
}
}
