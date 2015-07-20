views.ArticleDetailVizArticleReferrers = views.AA_BaseArticleViz.extend({

	initialize: function(options){
		var ga_metrics = options.ga_metrics,
				title = options.title,
				which = options.which;

		this.section_title = title;
		this.setMarkup();
		this.$el.attr('data-which', which);

		console.log(ga_metrics)

		var article_referrers_from_article = ga_metrics.article_referrers;

		this.data = article_referrers_from_article;

		return this;
	},

	// Override the base view's `render` function
	render: function(){
		var that = this;
		var vizContainer = this.$vizContainer.get(0);
		var d3_vizContainer = d3.select(vizContainer);

		var _links = d3_vizContainer.selectAll('.bar-container').data(this.data).enter();

		_links.append('div')
			.classed('bar-text', true)
			.html(function(d){
				return '<a href="'+d+'" target="_blank">'+that.ppUrl(d)+'</a>';
			});

		return this;
	},

	ppUrl: function(url){
		// Strip out http
		url = url.replace(/(http|https):\/\//,'');
		// Bold domain
		url = url.replace(/[^w{3}\.]([a-zA-Z0-9]([a-zA-Z0-9\-]{0,65}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}/i, function(match){
			return '<span class="highlight">'+match+'</span>';
		});

		return url;

	}

});