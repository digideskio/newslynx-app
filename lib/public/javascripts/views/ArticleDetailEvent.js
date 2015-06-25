views.ArticleDetailEvent = Backbone.View.extend({

	className: 'event-container',

	events: {
		'click input.destroy': 'destroyEvent'
	},

	initialize: function(){

		this._subviews = [];
		// var that = this;
		// Don't need to do anything on initialize
		// this.d3_el = d3.select(this.el);

		this.listenTo(this.model, 'change:in_selection', this.killView);
		this.listenTo(this.model, 'refresh', this.refresh); // TODO, change where this is triggered
	},

	refresh: function(){
		// this.killView();

		// Clear if present
		// this.d3_el.select('.event-content').remove();
		this.render();
	},

	render: function(){
		var model_json = this.model.toJSON();
		var event_item_markup = templates.articleDetailEventFactory( _.extend(model_json, helpers.templates.articles) );
		this.$el.html(event_item_markup);

		// this.$form = this.$el.find('form');

		// this.postRender();


		// var model_data = this.model.toJSON(),
		// 		event_item;

		// var _el = this.d3_el.selectAll('.event-content').data([model_data]).enter();


		// var event_content = _el.append('div')
		// 		.classed('event-content', true);

		// // Timestamp
		// event_content.append('div')
		// 	.classed('event-timestamp', true)
		// 	.html(function(d){ return helpers.templates.prettyTimestamp(d.timestamp); });

		// // Title
		// event_content.append('div')
		// 	.classed('event-title', true)
		// 	.html(function(d){ return d.title; });

		// event_item = event_content.append('div')
		// 	.classed('event-item', true);

		// // Description
		// event_item.append('div')
		// 	.classed('event-item-title', true)
		// 	.html('Description');

		// event_item.append('div')
		// 	.classed('event-item-text', true)
		// 	.html(function(d){ 
		// 		var text = d.description;
		// 		if (text) {
		// 			text = text.replace(/\n/g,'<br/>')
		// 		}
		// 		return text;
		// 	});

		// if (model_data.link){
		// 	event_item = event_content.append('div')
		// 		.classed('event-item', true);

		// 	event_item.append('div')
		// 		.classed('event-item-title', true)
		// 		.html('Link');

		// 	event_item.append('div')
		// 		.classed('event-item-text', true)
		// 		.html(function(d){ 
		// 			return '<a href="'+d.link+'" target="_blank">' + d.link + '</a>'; 
		// 		});
		// }

		// // Tags
		// event_item = event_content.append('div')
		// 	.classed('event-item', true);

		// event_item.append('div')
		// 	.classed('event-item-title', true)
		// 	.html('Tags');

		// // Why is this important?
		// var tags_container = event_item.append('ul')
		// 	.classed('event-tags-container', true)
		// 	.classed('tag-list', true);

		// tags_container.selectAll('.tag').data(function(d){ return d.impact_tags_full; }).enter()
		// 	.append('li')
		// 		.classed('tag', true)
		// 		.classed('tooltipped', true)
		// 			.each(function(d){
		// 				var tag_model	= new models.subject_tag.Model(d);
		// 				var tag_view	= new views.ArticleSummaryDrawerImpactTag({model:tag_model}),
		// 						tag_markup = tag_view.render().$el.html(),
		// 						tag_color = tag_view.getColor(),
		// 						tag_label = tag_view.getLabel(),
		// 						border_color = tag_view.getBorderColor();

		// 				var d3_this = d3.select(this);
		// 				d3_this.style('background-color', tag_color);
		// 				// d3_this.style('border', '1px solid ' + border_color);
		// 				d3_this.attr('aria-label', tag_label);
		// 				d3_this.html(tag_markup);
		// 			});

		// // Save this so we may render 
		// var edit_event_btn_cntnr = event_content.append('div')
		// 	.classed('edit-event-container', true)
		// 	.classed('modal-parent', true);

		// edit_event_btn_cntnr.append('button')
		// 	.classed('modal-toggle', true)
		// 	.classed('edit-event', true)
		// 	.classed('mini', true)
		// 	.html('Edit')

		// var edit_event_btn_modal_outer = edit_event_btn_cntnr.append('div')
		// 	.classed('modal-outer', true);

		// this.edit_event_btn_modal_outer = edit_event_btn_modal_outer;

		// this.renderModal();

		return this;

	},/*

	postRender: function(){
		this.bakeEventEditor();

		return this;
	},

	bakeEventEditor: function(){

		var event_creator_view = new views.EventCreatorFromAlert({el: this.el, model: this.model.toJSON()});
		this._subviews.push(event_creator_view);
		this._time_picker = event_creator_view.time_picker;
		this.$el.append(event_creator_view.el);

		this.event_creator_view = event_creator_view;

		return this;

	},*/

	// renderModal: function(){

	// 	var modal_outer = this.edit_event_btn_modal_outer;
	// 	// We will pass the model's information
	// 	var all_data = this.model.toJSON();

	// 	var assignee = {
	// 		id: all_data.id,
	// 		title: all_data.title
	// 	};

	// 	var defaults = {
	// 		timestamp: all_data.timestamp,
	// 		link: all_data.link,
	// 		title: all_data.title,
	// 		description: all_data.description,
	// 		impact_tags: all_data.impact_tags_full
	// 	};

	// 	// // Create an instance of an event creator view
	// 	var event_creator_view = new views.EventEditor({defaults: defaults, el: modal_outer.node(), model: this.model});
	// 	this._subviews.push(event_creator_view);
	// },

	update: function(model, inSelection){
		if (!inSelection){
			this.killView();
		}

		return this;
	},

	destroyEvent: function(){
		var that = this;
		this.model.destroy({
    	success: function(model, response) {
				that.killView();

			},
			error: function(error){
				console.log('Error deleting event.', error);
			}
		});
	}

});