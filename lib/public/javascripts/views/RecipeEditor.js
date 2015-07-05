views.RecipeEditor = views.AA_BaseRecipe.extend({

	events: _.extend({
		'click .modal-outer': 'stopPropagation' // Stop propagation so that clicks in our modal form don't trigger a click on the drawer item
	}, views.AA_BaseRecipe.prototype.events),

	initialize: function(opts){
		// console.log('here',opts.model.options.set_event_tag_ids[0])
		var recipe_info = this.separateSchemaFromEvent(opts.model.options),
				recipe_options = recipe_info.settingsInfo,
				set_event_options = recipe_info.eventInfo;

		var sous_chef_options = collections.sous_chefs.instance.findWhere({slug: opts.model.sous_chef}).get('options'),
				sous_chef_info = this.separateSchemaFromEvent(sous_chef_options),
				sous_chef_schema = sous_chef_info.settingsInfo,
				set_event_schema = sous_chef_info.eventInfo;

		// Add the name manually
		// var recipe_schema_with_values = _.extend({
		// 		name: {
		// 			input_type: 'text',
		// 			selected: opts.model.name,
		// 			required: true
		// 		}
		// 	},
		// 	this.combineFormSchemaWithVals(sous_chef_schema, recipe_options)
		// 	);

		console.log(recipe_options)
		// Add the name and description manually
		var recipe_vals = _.extend({
			name: opts.model.name,
			description: opts.model.description,
		}, recipe_options);

		// Add the name manually
		// var recipe_schema = _.extend({
		// 	name: {
		// 		input_type: 'text',
		// 		selected: opts.model.name,
		// 	},
		// 	description: {
		// 		input_type: 'text',
		// 		selected: opts.model.description,
		// 	},

		// }, sous_chef_schema);

		// Set our list of required keys
		// _.each(recipe_schema_with_values, function(val, key){
		// 	if (val.required){
		// 		required_keys.push(key);
		// 	}
		// });

		// var set_event_schema_with_values = this.combineFormSchemaWithVals(set_event_schema, set_event_options);

		// Store these for use throughout this view
		// this.form_schema = recipe_schema_with_values;
		// this.event_schema = set_event_schema_with_values;
		// this.full_schema = $.extend(true, {}, recipe_schema_with_values, set_event_schema_with_values);
		// this.required_keys = required_keys;

		this.recipe_info = {
			schema: sous_chef_schema,
			vals: recipe_vals
		};
		this.event_info = {
			schema: set_event_schema,
			vals: set_event_options
		};
		this.form_info = {
			schema: _.extend({}, sous_chef_schema, set_event_schema),
			vals: _.extend({}, recipe_vals, set_event_options)
		};

		// Cache some jQuery selectors
		this.$form = this.$el.find('form');
		this.$defaultEvents = this.$el.find('.default-event-container');

		// Bake the modal container and form elements
		this.render();
		// // Init the title searcher, disable pikaday
		this.postRender({search: true});
		this.updateScheduleByLayout(); // calling this with nothing will trigger a change event on the dropdown which will trigger a layout

		return this;
	},

	render: function(){
		var markup = '',
				recipe_info = this.recipe_info,
				default_event_markup;

		// Bake the initial form data
		_.each(recipe_info.schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData, false, recipe_info.vals[fieldName]);
		}, this);

		this.$form.prepend(markup);

		default_event_markup = this.renderDefaultEvent();

		this.$defaultEvents.html(default_event_markup);

		return this;
	},

	renderDefaultEvent: function(){
		var markup = '',
				default_event_info = this.event_info;

		// Bake the initial form data
		_.each(default_event_info.schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData, 'default_event', default_event_info.vals[fieldName]);
		}, this);

		return markup
	},
	
	stopPropagation: function(e){
		e.stopPropagation();

		return this;
	}

});