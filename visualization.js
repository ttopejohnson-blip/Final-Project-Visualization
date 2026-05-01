let originalData = [];
let filteredData = [];

const genreColors = {
    'Battle Royale': '#e74c3c',
    'Action RPG': '#3498db',
    'MMORPG': '#2ecc71',
    'Fighting': '#f39c12',
    'Racing': '#9b59b6',
    'Simulation': '#1abc9c',
    'Strategy': '#e67e22',
    'Role Playing': '#e84393',
    'Puzzle': '#95a5a6',
    'Casual': '#7f8c8d',
    'Card': '#16a085',
    'MOBA': '#27ae60',
    'Sports': '#2980b9',
    'Adventure': '#8e44ad',
    'Sandbox': '#d35400'
};

const segmentColors = {
    'Whale': '#c0392b',
    'Dolphin': '#e67e22',
    'Minnow': '#27ae60'
};

function loadData() {
    Papa.parse("mobile_game_inapp_purchases.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            originalData = results.data.filter(row => row.UserID && row.InAppPurchaseAmount);
            filteredData = [...originalData];
            filteredData = filteredData.filter(d => 
                d.InAppPurchaseAmount && d.InAppPurchaseAmount > 0 &&
                d.GameGenre && d.Country && d.SpendingSegment
            );
            initializeUI();
            updateAllVisualizations();
            updateInsights();
        },
        error: function(error) {
            loadSampleData();
        }
    });
}

function loadSampleData() {
    const genres = Object.keys(genreColors);
    const countries = ['USA', 'China', 'India', 'Japan', 'UK', 'Germany', 'Canada', 'Brazil', 'Australia', 'France'];
    const segments = ['Whale', 'Dolphin', 'Minnow'];
    
    originalData = [];
    for (let i = 0; i < 500; i++) {
        const segment = segments[Math.floor(Math.random() * segments.length)];
        let amount = segment === 'Whale' ? 1000 + Math.random() * 4000 :
                     segment === 'Dolphin' ? 50 + Math.random() * 950 :
                     1 + Math.random() * 49;
        
        originalData.push({
            UserID: `user_${i}`,
            GameGenre: genres[Math.floor(Math.random() * genres.length)],
            Country: countries[Math.floor(Math.random() * countries.length)],
            SpendingSegment: segment,
            InAppPurchaseAmount: amount,
            SessionCount: Math.floor(5 + Math.random() * 25),
            Age: 18 + Math.random() * 40,
            Device: Math.random() > 0.5 ? 'iOS' : 'Android'
        });
    }
    filteredData = [...originalData];
    initializeUI();
    updateAllVisualizations();
    updateInsights();
}

function initializeUI() {
    const genres = [...new Set(originalData.map(d => d.GameGenre).filter(g => g))];
    const genreSelect = document.getElementById('genreFilter');
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });
    
    const regions = [...new Set(originalData.map(d => d.Country).filter(c => c))];
    const regionSelect = document.getElementById('regionFilter');
    regions.slice(0, 20).forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
    
    document.getElementById('genreFilter').addEventListener('change', applyFilters);
    document.getElementById('segmentFilter').addEventListener('change', applyFilters);
    document.getElementById('regionFilter').addEventListener('change', applyFilters);
    document.getElementById('deviceFilter').addEventListener('change', applyFilters);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
}

function applyFilters() {
    const genreFilter = document.getElementById('genreFilter').value;
    const segmentFilter = document.getElementById('segmentFilter').value;
    const regionFilter = document.getElementById('regionFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;
    
    filteredData = originalData.filter(d => {
        if (genreFilter !== 'all' && d.GameGenre !== genreFilter) return false;
        if (segmentFilter !== 'all' && d.SpendingSegment !== segmentFilter) return false;
        if (regionFilter !== 'all' && d.Country !== regionFilter) return false;
        if (deviceFilter !== 'all' && d.Device !== deviceFilter) return false;
        return true;
    });
    
    updateAllVisualizations();
    updateInsights();
}

function resetFilters() {
    document.getElementById('genreFilter').value = 'all';
    document.getElementById('segmentFilter').value = 'all';
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('deviceFilter').value = 'all';
    filteredData = [...originalData];
    updateAllVisualizations();
    updateInsights();
}

function updateAllVisualizations() {
    updateGenreChart();
    updateSegmentChart();
    updateGeoChart();
    updateScatterChart();
}

function updateGenreChart() {
    const margin = { top: 30, right: 20, bottom: 80, left: 60 };
    const width = document.getElementById('genreChart').clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    d3.select('#genreChart').selectAll('*').remove();
    
    const genreData = d3.rollup(filteredData, 
        v => ({
            avgAmount: d3.mean(v, d => d.InAppPurchaseAmount),
            count: v.length
        }),
        d => d.GameGenre
    );
    
    let genreArray = Array.from(genreData, ([genre, stats]) => ({
        genre,
        avgAmount: stats.avgAmount,
        count: stats.count
    })).sort((a, b) => b.avgAmount - a.avgAmount);
    
    const svg = d3.select('#genreChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleBand()
        .domain(genreArray.map(d => d.genre))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(genreArray, d => d.avgAmount) * 1.1])
        .range([height, 0]);
    
    svg.selectAll('.bar')
        .data(genreArray)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.genre))
        .attr('width', xScale.bandwidth())
        .attr('y', d => yScale(d.avgAmount))
        .attr('height', d => height - yScale(d.avgAmount))
        .attr('fill', d => genreColors[d.genre] || '#7f8c8d')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 0.7);
            showTooltip(event, `Genre: ${d.genre}\nAvg: $${d.avgAmount.toFixed(2)}\nPlayers: ${d.count}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        });
    
    svg.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${d.toFixed(0)}`));
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-35)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.3em')
        .style('font-size', '10px');
}

function updateSegmentChart() {
    const margin = { top: 30, right: 20, bottom: 40, left: 70 };
    const width = document.getElementById('segmentChart').clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    d3.select('#segmentChart').selectAll('*').remove();
    
    const segmentData = d3.rollup(filteredData,
        v => ({
            avgAmount: d3.mean(v, d => d.InAppPurchaseAmount),
            count: v.length
        }),
        d => d.SpendingSegment
    );
    
    const segmentArray = Array.from(segmentData, ([segment, stats]) => ({
        segment,
        avgAmount: stats.avgAmount,
        count: stats.count
    })).sort((a, b) => b.avgAmount - a.avgAmount);
    
    const svg = d3.select('#segmentChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleBand()
        .domain(segmentArray.map(d => d.segment))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(segmentArray, d => d.avgAmount) * 1.1])
        .range([height, 0]);
    
    svg.selectAll('.bar')
        .data(segmentArray)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.segment))
        .attr('width', xScale.bandwidth())
        .attr('y', d => yScale(d.avgAmount))
        .attr('height', d => height - yScale(d.avgAmount))
        .attr('fill', d => segmentColors[d.segment] || '#7f8c8d')
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.segment}\nAvg: $${d.avgAmount.toFixed(2)}\nPlayers: ${d.count}`);
        })
        .on('mouseout', hideTooltip);
    
    svg.append('g').call(d3.axisLeft(yScale).tickFormat(d => `$${d.toFixed(0)}`));
    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    
    svg.selectAll('.label')
        .data(segmentArray)
        .enter()
        .append('text')
        .attr('x', d => xScale(d.segment) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.avgAmount) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(d => `$${d.avgAmount.toFixed(0)}`);
}

function updateGeoChart() {
    const margin = { top: 30, right: 100, bottom: 50, left: 100 };
    const width = document.getElementById('geoChart').clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    d3.select('#geoChart').selectAll('*').remove();
    
    const countryData = d3.rollup(filteredData,
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.Country
    );
    
    let countryArray = Array.from(countryData, ([country, totalSpend]) => ({
        country,
        totalSpend
    })).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10);
    
    const svg = d3.select('#geoChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(countryArray, d => d.totalSpend)])
        .range([0, width]);
    
    const yScale = d3.scaleBand()
        .domain(countryArray.map(d => d.country))
        .range([0, height])
        .padding(0.2);
    
    svg.selectAll('.bar')
        .data(countryArray)
        .enter()
        .append('rect')
        .attr('y', d => yScale(d.country))
        .attr('height', yScale.bandwidth())
        .attr('x', 0)
        .attr('width', d => xScale(d.totalSpend))
        .attr('fill', '#3498db')
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.country}\nTotal: $${d.totalSpend.toFixed(2)}`);
        })
        .on('mouseout', hideTooltip);
    
    svg.append('g').call(d3.axisLeft(yScale));
    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
}

function updateScatterChart() {
    const margin = { top: 30, right: 100, bottom: 50, left: 70 };
    const width = document.getElementById('scatterChart').clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    d3.select('#scatterChart').selectAll('*').remove();
    
    const scatterData = filteredData.slice(0, 500);
    
    const svg = d3.select('#scatterChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(scatterData, d => d.SessionCount || 20)])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(scatterData, d => d.InAppPurchaseAmount) * 1.1])
        .range([height, 0]);
    
    svg.selectAll('.dot')
        .data(scatterData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.SessionCount || 0))
        .attr('cy', d => yScale(d.InAppPurchaseAmount))
        .attr('r', 4)
        .attr('fill', d => segmentColors[d.SpendingSegment] || '#7f8c8d')
        .attr('opacity', 0.6)
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 7).attr('opacity', 1);
            showTooltip(event, `Sessions: ${d.SessionCount}\nPurchase: $${d.InAppPurchaseAmount.toFixed(2)}\nGenre: ${d.GameGenre}\nSegment: ${d.SpendingSegment}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('r', 4).attr('opacity', 0.6);
            hideTooltip();
        });
    
    const xValues = scatterData.map(d => d.SessionCount || 0);
    const yValues = scatterData.map(d => d.InAppPurchaseAmount);
    const n = scatterData.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const lineX1 = 0;
    const lineY1 = intercept;
    const lineX2 = d3.max(xValues);
    const lineY2 = slope * lineX2 + intercept;
    
    svg.append('line')
        .attr('x1', xScale(lineX1))
        .attr('y1', yScale(lineY1))
        .attr('x2', xScale(lineX2))
        .attr('y2', yScale(lineY2))
        .attr('stroke', '#c0392b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');
    
    svg.append('g').call(d3.axisLeft(yScale).tickFormat(d => `$${d.toFixed(0)}`));
    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    
    const legend = svg.append('g').attr('transform', `translate(${width - 80}, 0)`);
    let legendY = 0;
    Object.entries(segmentColors).forEach(([segment, color]) => {
        legend.append('circle').attr('cx', 0).attr('cy', legendY).attr('r', 4).attr('fill', color);
        legend.append('text').attr('x', 10).attr('y', legendY + 3).style('font-size', '10px').text(segment);
        legendY += 15;
    });
}

function updateInsights() {
    const totalRevenue = d3.sum(filteredData, d => d.InAppPurchaseAmount);
    const avgPurchase = d3.mean(filteredData, d => d.InAppPurchaseAmount);
    const totalPlayers = filteredData.length;
    
    const whaleRevenue = d3.sum(filteredData.filter(d => d.SpendingSegment === 'Whale'), d => d.InAppPurchaseAmount);
    const whalePercent = (whaleRevenue / totalRevenue * 100).toFixed(1);
    
    const genreSpend = d3.rollup(filteredData, 
        v => d3.sum(v, d => d.InAppPurchaseAmount),
        d => d.GameGenre
    );
    const topGenre = Array.from(genreSpend, ([genre, spend]) => ({genre, spend}))
        .sort((a, b) => b.spend - a.spend)[0];
    
    const insightsHtml = `
        <div class="insight-card">
            <div class="insight-label">Total Revenue</div>
            <div class="insight-value">$${totalRevenue.toFixed(0)}</div>
        </div>
        <div class="insight-card">
            <div class="insight-label">Average Purchase</div>
            <div class="insight-value">$${avgPurchase.toFixed(2)}</div>
        </div>
        <div class="insight-card">
            <div class="insight-label">Players</div>
            <div class="insight-value">${totalPlayers.toLocaleString()}</div>
        </div>
        <div class="insight-card">
            <div class="insight-label">Whale Revenue</div>
            <div class="insight-value">${whalePercent}%</div>
        </div>
        <div class="insight-card">
            <div class="insight-label">Top Genre</div>
            <div class="insight-value">${topGenre?.genre || 'N/A'}</div>
        </div>
    `;
    
    document.getElementById('insightsBar').innerHTML = insightsHtml;
}

let tooltipDiv = null;

function showTooltip(event, content) {
    if (!tooltipDiv) {
        tooltipDiv = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }
    
    tooltipDiv.html(content.replace(/\n/g, '<br>'))
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px')
        .style('opacity', 1);
}

function hideTooltip() {
    if (tooltipDiv) {
        tooltipDiv.style('opacity', 0);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});