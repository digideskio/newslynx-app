views.ArticleDetail = Backbone.View.extend({

	tagName: 'div',

	className: 'article-detail-wrapper',

	events: {
		'click .tab': 'setActiveTabFromClick',
		'click .modal-toggle': 'toggleModal', // Define this here because we have a few different views like event creators
		'click .modal-parent[data-which="subject"] .modal-close': 'toggleModal',
		'click .load-more': 'moreEvents',
		'click #download-data[href="#"]': 'setDownloadButton'
	},

	initialize: function(){

		// Keep track of all views this view creates
		this._subviews = [];
		this.listenTo(this.model, 'destroyDetail', this.destroyView);

		// This will populate from a fetch
		this.article_detailed_events_collection = new collections.article_detailed_events.Collection();
		this.event_filters = new models.filters.Model({sort_by: 'created'}); // Hardcode this for now until we figure out the UI for sorting events

		// This will also populate from a fetch
		this.article_detailed_timeseries = new collections.article_detailed_timeseries.Collection();
		this.article_detailed_timeseries.setUrl(this.model.id);

		// This will also populate from a fetch
		this.article_detailed_tweets = new collections.article_detailed_tweets.Collection();
		this.article_detailed_tweets.setUrl(this.model.id);

		// Listen to changes on it and add / remove events accordingly
		this.listenTo(this.article_detailed_events_collection, 'add', this.eventsGallery.add);
		this.listenTo(this.article_detailed_events_collection, 'remove', this.eventsGallery.remove);
		this.listenTo(this.article_detailed_events_collection, 'error', this.reportErr);

		// Just listen to errors on it for now
		this.listenTo(this.article_detailed_timeseries, 'error', this.reportErr);
		this.listenTo(this.article_detailed_tweets, 'error', this.reportErr);

		/* Tag baking */
		// Listen for adding things from the page and bake them
		this.listenTo(collections.article_detailed_subject_tags.instance, 'add', this.subject_tags.add);
		this.listenTo(collections.article_detailed_subject_tags.instance, 'remove', this.subject_tags.remove);
		this.listenTo(collections.article_detailed_subject_tags.instance, 'error', this.reportErr);

		// Do the same thing for impact tags
		this.listenTo(collections.article_detailed_impact_tags.instance, 'add', this.impact_tags.add);
		this.listenTo(collections.article_detailed_impact_tags.instance, 'remove', this.impact_tags.remove);

		// And impact categories
		this.listenTo(collections.article_detailed_impact_tag_attributes.categories_instance, 'add', this.impact_tag_attribute.add);
		this.listenTo(collections.article_detailed_impact_tag_attributes.categories_instance, 'remove', this.impact_tag_attribute.remove);

		// And levels
		this.listenTo(collections.article_detailed_impact_tag_attributes.levels_instance, 'add', this.impact_tag_attribute.add);
		this.listenTo(collections.article_detailed_impact_tag_attributes.levels_instance, 'remove', this.impact_tag_attribute.remove);
		/* end tag baking */

		/* Setup event filtering */

		// Add them to a collection so we can more easily filter and figure out adding and removing of elements
		var fetchEventsByParameters_debounced = _.debounce(this.fetchEventsByParameters, 5);
		this.listenTo(this.event_filters, 'hasChanged', fetchEventsByParameters_debounced);

		models.event_tag_facets = new models.generic.Model({});
		this.listenTo(models.event_tag_facets, 'change', this.updateTagContainerByCounts);
		this.articles_impact_tags_collection 						= new collections.impact_tags.Collection(this.model.get('impact_tags_full'));
		this.articles_impact_tag_categories_collection	= new collections.impact_tag_attributes.Collection(this.model.get('impact_tag_categories'));
		this.articles_impact_tag_levels_collection			= new collections.impact_tag_attributes.Collection(this.model.get('impact_tag_levels'));

		// Set this metadata for how it gets its counts and for how it will add its values for filtering by api call
		this.articles_impact_tags_collection.metadata('filter', 'impact_tag_ids');
		this.articles_impact_tag_categories_collection.metadata('filter', 'categories');
		this.articles_impact_tag_levels_collection.metadata('filter', 'levels');

		/* end event filtering */


		/* Setup Spotted Tail */
		this.chartSelector = '#ST-chart';

		this.legend =	{
			facebook_shares: {service: 'Facebook', metric: 'shares', color: '#3B5998', group: 'a'},
			twitter_shares: {service: 'Twitter', metric: 'shares', color: '#55ACEE', group: 'a'},
			ga_pageviews: {service: '', metric: 'pageviews', color: '#FF7F0E', group: 'b'}
		};

		// Throttle this for onBrush callback
		this.filterEventsByDateRange_throttled = _.throttle(this.filterEventsByDateRange, 100);


		// Throttle resize
		this.onWindowResize_throttled = _.throttle(this.onWindowResize, 200);

		var self = this;
		$( window ).resize(function() {
			self.onWindowResize_throttled.call(self);;
		});

	},

	render: function(){
		var model_json = this.model.toJSON();
		var article_detail_markup = templates.articleDetailFactory( _.extend({}, model_json, helpers.templates.articles) );
		this.$el.html(article_detail_markup);
		// console.log(model_json);

		return this;
	},

	reportErr: function(model, msg){
		var response;
		if (msg.responseJSON){
			response = msg.responseJSON;
		} else {
			response = msg;
		}
		console.log('ERROR in model:',model);
		console.log('ERROR message:', response);
		alert(response.error  +' ' + response.status_code + ': ' + response.message);
	},

	setLoading: function($target, state){
		$target.attr('data-loading', state);
		return this;
	},

	bakeInteractiveBits: function(){
		var self = this;
		// Event creator element
		this.$eventCreator = $('#event-creator-container');
		// Tag elements
		this.$subjectTagsContainer         = this.$el.find('.article-info-container[data-which="subject"] > ul.tags');
		this.$impactTagsContainer          = this.$el.find('.article-info-container[data-which="impact"] ul.tags');
		this.$impactTagCategoriesContainer = this.$el.find('.article-info-container[data-which="impact-categories"] ul.tags');
		this.$impactTagLevelsContainer     = this.$el.find('.article-info-container[data-which="impact-levels"] ul.tags');

		// Bake all of this newsroom's subject tags under the edit subject tags option
		this.$editSubjectTagsContainer     = this.$el.find('#subject-tag-settings');

		// The filer options for the events gallery
		this.$impactTagsList = this.$el.find('.option-container[data-type="impact-tags"] .tag-list');
		this.$impactTagCategoriesList = this.$el.find('.option-container[data-type="categories"] .tag-list');
		this.$impactTagLevelsList = this.$el.find('.option-container[data-type="levels"] .tag-list');

		// Stash these to iterate through them to update counts
		// This could be better handled if the tag container had its own view but it doesn't for now
		this.tag_list_els = {
			tags: this.$impactTagsList.parent(),
			categories: this.$impactTagCategoriesList.parent(),
			levels: this.$impactTagLevelsList.parent()
		};

		// Events container
		this.$eventsContainer = this.$el.find('#events-container');
		this.$eventsGalleryContainer = this.$el.find('#events-gallery-container');

		this.$downloadData = this.$el.find('#download-data');

		// Do some great async flow
		this.article_detailed_timeseries.fetch({
				data: {
					transform: 'cumulative' // TODO, make this configurable in the interface
				}
			})
			.then(function(models, status, response){
				
				// Get our events gallery items
				// Don't increment, this is the first run
				self.fetchEventsByParameters(false, true, function(){

					$(self.chartSelector).attr('data-loading', 'false')

					var events_data = self.article_detailed_events_collection.toJSON();

					self.spottedTail = spottedTail()
						.timezone(pageData.timezone)
						.y(function(d) { return +d.count; })
						.legend(self.legend)
						.events(events_data)
						.interpolate('step-after')
						.onBrush(_.noop);

					self.bakeChart(self.article_detailed_timeseries.toJSON());
				});

			});

		this.article_detailed_tweets.fetch()
			.then(function(models, status, response){
				self.bakeTweetz();
			});

		// What are we doin? 
		this.bakeTags();
		this.bakeEventCreator();
		this.bakeArticleVizs();
		// Bake some navigation
		this.setDetailNavigation();
		this.calcStickyOffsets();
		// Which tab is viewing
		this.setActiveTab();

		return this;
	},

	bakeEventGalleryFurniture: function(){
		// Remove placeholder info and set state 
		this.$eventsContainer.find('.placeholder').remove();
		this.bakeEventsGalleryFilters();
		// this.setLoading(this.$eventsContainer, 'false');
		// this.setLoadMoreEventsButton();
	},

	setDownloadButton: function(e){
		e.preventDefault(); 
		var $btnContainer = $(e.currentTarget),
				$downloadBtn = $btnContainer.find('button');

		$btnContainer.addClass('disabled').addClass('loading-spinner');
		$downloadBtn.html('Fetching...');

		var model_json = this.model.toJSON(),
				self = this;

		var csvs = {};
	  var now = helpers.common.toUserTimezone(new Date());

		var timestamp = now.format('YYYY-MM-DDTHH-mm');

		// Comparisons csv
		// console.log(flattenObj(models.comparison_metrics.toJSON()))
		csvs[timestamp+'_article_'+this.model.id+'_comparisons'] = app.helpers.exportData.flattenComparisons(models.comparison_metrics.toJSON(), [model_json]).map(app.helpers.exportData.addExportedDate(now));

		// Subject tag csv
		csvs[timestamp+'_article_'+this.model.id+'_subject_tags'] = app.helpers.exportData.concatTags([model_json], 'subject').map(app.helpers.exportData.addExportedDate(now))
		// Impact tag csv
		csvs[timestamp+'_article_'+this.model.id+'_impact_tags'] = app.helpers.exportData.concatTags([model_json], 'impact').map(app.helpers.exportData.addExportedDate(now))

		models.exports.fetch({
				data: {
					content_item_ids: this.model.id,
					timestamp: timestamp,
					now: now.format(),
					tags: pageData.tags
				}
			})
			.then(function(csvResponse, status, response){
				_.extend(csvs, csvResponse)
				try {
					// console.log(csvs)
					zip.zipMultiple(csvs, 'csv', function(zippedBlob, zippedBlobHref){
						$btnContainer.removeClass('disabled').removeClass('loading-spinner');
						$downloadBtn.html('Click to download!');
						self.$downloadData.attr('href', zippedBlobHref);
					});
				} catch(err){ 
					console.log(err)
					alert(err)
				}
			})

	},

	bakeChart: function(timeseriesData){
		d3.select(this.chartSelector)
			.datum(timeseriesData)
			.call(this.spottedTail);

		return this;

	},

	calcStickyOffsets: function(){
		// Save the offset of the sticky element
		var $sticky = this.$el.find('.sticky'),
				$sticky_anchor = this.$el.find('.sticky-anchor'),
				sticky_anchor_offset;

		if ($sticky.length && $sticky_anchor.length) {
			sticky_anchor_offset = $sticky_anchor.position().top + $('#content').scrollTop();
			$sticky.attr('data-offset', sticky_anchor_offset);
		}

		return this;
	},

	onWindowResize: function(){
		this.calcStickyOffsets();
	},

	bakeEventsGalleryFilters: function(){
		// Impact tags
		if (this.articles_impact_tags_collection.length){
			this.$impactTagsList.html('');
			this.articles_impact_tags_collection.each(function(tagModel){
				var tag_view = new views.TagEventFilter({ model: tagModel, filterModel: this.event_filters });
				// Keep track of this subview so self we might destroy it later!
				this._subviews.push(tag_view);
				this.$impactTagsList.append(tag_view.render().el);
			}, this);
		}

		// Impact tag categories
		if (this.articles_impact_tag_categories_collection.length){
			this.articles_impact_tag_categories_collection.each(function(tagModel){
				this.$impactTagCategoriesList.html('');
				var tag_view = new views.TagEventFilter({ model: tagModel, filterModel: this.event_filters });
				// Keep track of this subview so self we might destroy it later!
				this._subviews.push(tag_view);
				this.$impactTagCategoriesList.append(tag_view.render().el);
			}, this);
		}

		// Impact tag levels
		if (this.articles_impact_tag_levels_collection.length){
			this.articles_impact_tag_levels_collection.each(function(tagModel){
				this.$impactTagLevelsList.html('');
				var tag_view = new views.TagEventFilter({ model: tagModel, filterModel: this.event_filters });
				// Keep track of this subview so self we might destroy it later!
				this._subviews.push(tag_view);
				this.$impactTagLevelsList.append(tag_view.render().el);
			}, this);
		}

		return this;
	},

	bakeArticleVizs: function(){

		var $articleVizsReadingContainer = this.$el.find('section.detail-section[data-group="reading"]');
		var ga_metrics = this.model.getGaMetrics();
		// var tweet_info = this.model.get('tweet_info');

		// Only bake these if we have referrer data
		if (!_.isEmpty(ga_metrics)){
			$articleVizsReadingContainer.html('');
			// /* DEVICE FACET */
			var device_facet_view = new views.ArticleDetailVizDeviceFacet({
				title: 'On which devices are people reading?', 
				ga_metrics: ga_metrics,
				which: 'device'
			});
			this._subviews.push(device_facet_view);
			var device_facet_markup = device_facet_view.render('marker-also').el;
			$articleVizsReadingContainer.append(device_facet_markup);
			/* end device facet */

			/* INTERNAL/EXTERNAL */
			var internal_external_facet_view = new views.ArticleDetailVizInternalExternal({
				title: 'Is traffic internally or externally driven?', 
				ga_metrics: ga_metrics,
				which: 'internal-external'
			});
			this._subviews.push(internal_external_facet_view);
			var internal_external_facet_markup = internal_external_facet_view.render('marker-also').el;
			$articleVizsReadingContainer.append(internal_external_facet_markup);
			/* end device facet */

			/* DOMAIN REFERRERS */
			var domain_facet_view = new views.ArticleDetailVizDomainFacets({
				title: 'Who\'s sending readers here?', 
				ga_metrics: ga_metrics,
				which: 'domain-referrers'
			});
			this._subviews.push(domain_facet_view);
			var domain_facet_markup = domain_facet_view.render().el;
			$articleVizsReadingContainer.append(domain_facet_markup);
			/* end device facet */


			/* ARTICLE REFERRERS */
			var domain_facet_view = new views.ArticleDetailVizArticleReferrers({
				title: 'What articles link here?', 
				ga_metrics: ga_metrics,
				which: 'article-referrers'
			});
			this._subviews.push(domain_facet_view);
			var domain_facet_markup = domain_facet_view.render().el;
			$articleVizsReadingContainer.append(domain_facet_markup);
			/* end article referrers */

		}

		return this;
	},

	bakeTweetz: function(){
		var tweets = this.article_detailed_tweets.toJSON(),
				$articleVizsTweetsContainer = this.$el.find('section.detail-section[data-group="tweeting"]');

		/* TWEEETZ */
		if (!_.isEmpty(tweets)){
			$articleVizsTweetsContainer.html('');
			var tweets_view = new views.ArticleDetailVizTweets({
				title: 'Who\'s tweeted this story?', 
				tweets: tweets,
				which: 'tweets'
			});
			this._subviews.push(tweets_view);
			var tweet_markup = tweets_view.render().el;
			$articleVizsTweetsContainer.append(tweet_markup);
			/* end tweetz */
			
		}

		return this;
	},

	eventsGallery: {
		add: function(eventModel){
			var item_view,
					item_el;

			eventModel.set('in_selection', true);
			item_view = new views.ArticleDetailEvent({model: eventModel});
			// Keep track of this subview so self we might destroy it later!
			this._subviews.push(item_view);
			item_el = item_view.render().el;
			this.$eventsGalleryContainer.append(item_el);
			return this;
		},
		remove: function(eventModel){
			eventModel.set('in_selection', false);
			return this;
		},
		setActiveEvents: function(){
			var current_filtered_set = views.po.article_detailed_events.getCurrentItems();

			// // To maintain the correct sort order on the dom, we want to empty it
			this.article_detailed_events_collection.set([]);
			// // For changing the drawer list items based on filters
			this.article_detailed_events_collection.set(current_filtered_set);
		}
	},

	updateEventGalleryItems: function(){
		return this;
	},

	bakeTags: function(){
		// Append some things after the HTML has been baked
		// Such as tags
		var local_subject_tags_collection;

		// Set up the other collections and page elements
		// Populate tags into the subject_tag
		var subject_tags_full     		= this.model.get('subject_tags_full');
		var subject_tag_input_options = this.model.get('subject_tag_input_options');
		var impact_tags_full      		= this.model.get('impact_tags_full');
		var impact_tag_categories 		= this.model.get('impact_tag_categories');
		var impact_tag_levels     		= this.model.get('impact_tag_levels');

		// If we have subject tags, clear our placeholder 'No tags' and add the real tags
		if (subject_tags_full.length){
			this.$subjectTagsContainer.html('');
			collections.article_detailed_subject_tags.instance.set(subject_tags_full);
		} else {
			// If we don't have anything, empty this collection
			collections.article_detailed_subject_tags.instance.set([]);
		}

		// Impact tag categories
		if (impact_tags_full.length){
			this.$impactTagsContainer.html('');
			collections.article_detailed_impact_tags.instance.set(impact_tags_full);
		} else {
			// If we don't have anything, empty this collection
			collections.article_detailed_impact_tags.instance.set([]);
		}


		// Impact tag categories
		if (impact_tag_categories.length){
			this.$impactTagCategoriesContainer.html('');
			collections.article_detailed_impact_tag_attributes.categories_instance.set(impact_tag_categories);
		} else {
			// If we don't have anything, empty this collection
			collections.article_detailed_impact_tag_attributes.categories_instance.set([]);
		}

		// Impact tag levels
		if (impact_tag_levels.length){
			this.$impactTagLevelsContainer.html('');
			collections.article_detailed_impact_tag_attributes.levels_instance.set(impact_tag_levels);
		} else {
			// If we don't have anything, empty this collection
			collections.article_detailed_impact_tag_attributes.levels_instance.set([]);
		}


		// Add all account subject tags to the maker modal
		if (collections.subject_tags.instance.length){
			this.$editSubjectTagsContainer.html('<div class="description">Add subject tags to this article.</div>');

			// Make a copy for every article
			// collections.subject_tags.instance.each(function(subjectTagModel){
			subject_tag_input_options.forEach(function(subjectTagModel){
				var subject_tag_view,
						subject_tag_el;

				subject_tag_view = new views.ArticleDetailSubjectTagEditor({model: subjectTagModel, articleTags: subject_tags_full});
				// Keep track of this subview so self we might destroy it later!
				this._subviews.push(subject_tag_view);
				subject_tag_el = subject_tag_view.render().el;
				this.$editSubjectTagsContainer.append(subject_tag_el);
			// }, this);

			}, this);

			// Init dragging on this modal
			var editSubjectTagsWrapper = this.$el.find('#add-subject-tag').parents('.modal-parent').find('.modal-inner')[0];
			d3.select(editSubjectTagsWrapper).call(this.drag());

		}
	},

	subject_tags: {
		add: function(subjectTagModel){
			var item_view,
					item_el;

			// If this article didn't have any before
			if (collections.article_detailed_subject_tags.instance.length == 1){
				this.$subjectTagsContainer.html('');
			}
			item_view = new views.ArticleDetailSubjectTag({model: subjectTagModel});
			this._subviews.push(item_view);
			item_el = item_view.render().el;
			this.$subjectTagsContainer.append(item_el);
			return this;
		},
		remove: function(subjectTagModel){
			// console.log('removing')
			// this.killView();
			if (collections.article_detailed_subject_tags.instance.length == 0){
				this.$subjectTagsContainer.append('<li class="tag empty">None</li>');
			}
			subjectTagModel.trigger('destroy');
			// subjectTagModel.set('destroy', true);
			return this;
		}
	},	
	impact_tags: {
		add: function(impactTagModel){
			var item_view,
					item_el;
			item_view = new views.ArticleDetailImpactTag({model: impactTagModel});
			this._subviews.push(item_view);
			item_el = item_view.render().el;
			this.$impactTagsContainer.append(item_el);
			return this;
		},
		remove: function(subjectTagModel){
			// console.log('removing')
			// this.killView();
			subjectTagModel.set('destroy', true);
			return this;
		}
	},
	impact_tag_attribute: {
		add: function(attributeModel, collection){
			var item_view,
					item_el;
			// This will tell us if we should append to the `category` or `level` list
			var which_collection = collection.metadata('which'),
					containers = {
						categories: this.$impactTagCategoriesContainer,
						levels: this.$impactTagLevelsContainer    
					},
					container = containers[which_collection];

			item_view = new views.ArticleDetailAttributeTag({model: attributeModel});
			this._subviews.push(item_view);
			item_el = item_view.render().el;
			container.append(item_el);
			return this;
		},
		remove: function(){

		}
	},

	bakeEventCreator: function(){
		// We will pass the assignee into the event creator view so it can set self field
		var defaults = {
			status: 'approved',
			content_items: [{
				id: this.model.id,
				title: this.model.get('title')
			}]
		};

		// Create an instance of an event creator view
		var event_creator_view = new views.EventCreator({el: this.$eventCreator[0], model: defaults, collection: this.article_detailed_events_collection, saveMsg: 'Event saved!'});
		this._subviews.push(event_creator_view);
		this._time_picker = event_creator_view._time_picker;
		return this;
	},

	filterEventsByDateRange: function(timestampRange, empty){
		// Reconvert out of user timezone and set to timestamp
		collections.po.article_detailed_events.filters.timestamp.clearQuery();
		// The second argument tells us whether our brush is empty, only filter it if we are actively filtering, aka, not empty
		// This protects against the situation where the date of an event is outside the range of the graph
		// Clicking off the graph filter will set your filter to its extents, which may not be the extends of your events
		if (!empty){
			collections.po.article_detailed_events.filters.timestamp.intersectQuery(timestampRange)
		}
	},

	setActiveTab: function(){
		var group = collections.article_detailed.instance.metadata('selected-tab');

		var $tab 		= this.$el.find('.tab[data-group="'+group+'"]'),
				$target = $('.detail-section[data-group="'+group+'"]');
		// Update style on this tab
		this.$el.find('.tab').removeClass('active');
		$tab.addClass('active');

		// Hide other section
		$('.detail-section').hide();
		// Show the section we want
		$target.show();

		return this;
	},

	setActiveTabFromClick: function(e){
		var $tab = $(e.currentTarget),
				group;

		// Only proceed if there is no active class
		if (!$tab.hasClass('active')){
			group   = $tab.attr('data-group');
			collections.article_detailed.instance.metadata('selected-tab', group);
			this.setActiveTab();
		}
		return this;
	},

	setDetailNavigation: function(){
		var comparison_models = app.instance.staged_article_comparison_models,
				comparison_ids = _.pluck(comparison_models, 'id'),
				this_id = this.model.id,
				this_id_index = comparison_ids.indexOf(this_id),
				$nav = this.$el.find('.article-detail-navigation'),
				$prev = $nav.find('.prev'),
				$next = $nav.find('.next'),
				$spacer = $nav.find('.spacer'),
				prev_model_index = this_id_index - 1,
				next_model_index = this_id_index + 1,
				prev_model,
				next_model,
				prev_title,
				next_title;

		if (this_id_index != -1) {
			// If it's not the first one, print a previous
			if (this_id_index > 0) {
				prev_model = comparison_models[prev_model_index];
				prev_title = helpers.templates.htmlDecode(prev_model.get('title'));

				$prev.html(' Prev')
					.addClass('go-to-detail')
					.attr('data-id',  prev_model.get('id'))
					.attr('aria-label', prev_title)
					.prepend('<span class="octicon octicon-chevron-left"></span>')
			}

			// If it's not the last one print a next
			if (this_id_index < comparison_ids.length - 1) {
				next_model = comparison_models[next_model_index];
				next_title = helpers.templates.htmlDecode(next_model.get('title'));

				$next.html('Next ')
					.addClass('go-to-detail')
					.attr('data-id', next_model.get('id'))
					.attr('aria-label', next_title)
					.append('<span class="octicon octicon-chevron-right"></span>')

			}

		}

	},

	toggleModal: function(e){
		// Open up a modal self lets you assign it to something
		views.helpers.toggleModal(e);
	},

	destroyView: function(model){
		// this._time_picker.destroy();
		this.killView();
	},

	drag: function(){
		return d3.behavior.drag()
					.on("drag", function(d,i) {
						var D3_modal_inner = d3.select(this),
								top = parseInt(D3_modal_inner.style('top')),
								left = parseInt(D3_modal_inner.style('left'));

						top += d3.event.dy;
						left += d3.event.dx;

						D3_modal_inner.style('top', top+'px').style('left', left+'px');
							
					})
	},

	// clearLoadMoreButton: function(){
	// 	this.$eventsGalleryContainer

	// 	return this;
	// },

	moreEvents: function(e){
		app.helpers.gifizeLoadMoreButton($(e.currentTarget));

		this.fetchEventsByParameters(true);

		return this;
	},

	setLoadMoreEventsButton: function(){

		// Set up what collection we want to follow
		var this_collection = this.article_detailed_events_collection,
				$list = this.$eventsGalleryContainer,
				$loadMoreBtn; // To be created and appended below, if we need it.

		// Always kill the button
		// this.clearLoadMoreButton();
		$list.find('.load-more').remove();

		var pagination_info = this_collection.metadata('pagination');
		var current_page = pagination_info.page,
				page_size = pagination_info.per_page,
				total_pages = pagination_info.total_pages;

		var currently_loaded_count = this_collection.length,
				total_pending_for_search = this_collection.metadata('total');

		// Do we need the button
		var more_alerts_to_load = current_page < total_pages,
				remaining_alerts = total_pending_for_search - currently_loaded_count,
				to_load_string = _.min([remaining_alerts, page_size]), // Say you'll load either a full page or how many are left, whichever is smaller
				button_str;

		if (more_alerts_to_load){
			// Create a little button in-memory (for now)
			$loadMoreBtn = $('<button class="load-more"></button>');
			button_str = 'Showing ' + currently_loaded_count + ' out of ' + total_pending_for_search + '. Load ' + to_load_string + ' more...'

			// Finally, append it as the last thing
			$loadMoreBtn.html(button_str).appendTo($list);

		}

		return this;

	},

	fetchEventsByParameters: function(increment, firstRun, cb){
		var self = this;
		var params = this.event_filters.assembleQueryParams();
		params.content_item_ids = this.model.id;

		var this_collection = this.article_detailed_events_collection;
		var collection_pagination = this_collection.metadata('pagination') || {};
		var current_page = collection_pagination.page;

		this.toggleFilterBtns();
		// console.log('params',params);

		// This is the initial loading state
		if (increment){
			params.page = current_page + 1;
		} else {
			// Set the loading state
			self.setLoading.call(self, self.$eventsContainer, true);
			// Also call this on the content div so we can freeze scrolling to avoid a jump when the container goes empty
			// app.instance.setLoading.call(app.instance, app.instance.$content, true);
			// // Clear the set
			this_collection.set([]);
		}
		// // Responsive articles will be added to `this_collection`
		// // `pagination and `total` information will be added as metadata on that collection
		this_collection.fetch({data: params, remove: false})
			.then(function(model, status, response){
				// This is only called on success, error are caught by our listener above
				if (firstRun && response.responseJSON.total > 0){
					self.bakeEventGalleryFurniture();
					// self.setDownloadButton();
				}
				self.setLoading.call(self, self.$eventsContainer, 'false');
				// app.instance.setLoading.call(app.instance, app.instance.$content, 'false');
				self.setLoadMoreEventsButton.call(self);

				if (cb) {
					cb();
				}

			});

		return this;
	},

	updateTagContainerByCounts: function(){

		_.each(this.tag_list_els, function($el, key){
			var facet = models.event_tag_facets.get(key);
			$el.find('.count').html(facet.length);
			var has_facet = facet.length > 0;
			$el.toggleClass('disabled', !has_facet);

		}, this);

		return this;
	},

	toggleFilterBtns: function(){
		_.each(this.tag_list_els, function($el, key){
			var $clearBtn = $el.find('.clear');
			// Do some massaging based on what our `data-type` and what the key under `models.content_item_filters` is
			// They differ bc the filter keys are what the api expects. 
			// TODO, This is a candidate for refactoring now that the API is stable
			if (key === 'tags'){
				key = 'tag_ids';
			}
			var group_active = this.event_filters.metadata(key);
			app.instance.toggleFilterBtn($clearBtn, group_active);
		}, this);
		return this;
	}
});
