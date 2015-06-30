models.article_summary = {
	"Model": Backbone.Model.extend({
		defaults: {
			active_selected: false,
			selected_for_compare: false,
			selected_for_detail: false
			// in_drawer: true,
			// destroy: false
		},
		toggle: helpers.modelsAndCollections.toggle,

		parse: function(articleSummaryJson){
			var hydrated_article_summary = this.hydrateTagsInfo(articleSummaryJson, pageData.tags, ['subject_tag_ids', 'impact_tag_ids']);
			var nested_tags = this.nestTags(hydrated_article_summary);
			return nested_tags;
		},

		// For general display
		hydrateTagsInfo: function(dehydratedObj, tags, tagKeys){
			tagKeys.forEach(function(key){
				// Add the full info on a key name with `full` in the title
				// This will take take ids in `obj['impact']` or `obj['subject']` and map them like to
				// `subject_tag_ids` => `subject_tags_full`
				if (dehydratedObj[key]){
					var full_key = key.replace('_ids', 's_full'); 
					dehydratedObj[full_key] = dehydratedObj[key].map(function(id){ 
						var tag_key = key.replace('_tag_ids',''); // They're stored on our tags object just as `subject` and and `impact`
						return _.findWhere(tags[tag_key], {id: id});
					}).sort(function(a,b){
						return a.name.localeCompare(b.name);
					});
				}

				// Add `impact_tag_categories` and `impact_tag_levels` as their own items
				var impact_tag_categories = _.chain(dehydratedObj.impact_tags_full)
																														.pluck('category')
																														.uniq()
																														.map(function(nameText){
																															var attr = {};
																															attr.name = nameText;
																															attr.color = pageData.attributeColorLookup[nameText];
																															return attr;
																														})
																														.value();

				var impact_tag_levels     = _.chain(dehydratedObj.impact_tags_full)
																														.pluck('level')
																														.uniq()
																														.map(function(nameText){
																															var attr = {};
																															attr.name = nameText;
																															attr.color = pageData.attributeColorLookup[nameText];
																															return attr;
																														})
																														.value();

				dehydratedObj['impact_tag_categories'] = _.sortBy(impact_tag_categories, 'name');
				dehydratedObj['impact_tag_levels'] 		= _.sortBy(impact_tag_levels, 'name');

			});
			return dehydratedObj;
		},

		// For display in article comparison row
		nestTags: function(unnestedObj){

			// For subject tags, chunk them into groups of three so they will be displayed as columns of no more than three. Each one looks like this and they're stored under `subject_tags_full`.
				/*
		    {
		      "articles": 2,
		      "domain": "propalpatine.org",
		      "name": "Fracking",
		      "color": "#6a3d9a",
		      "id": 5,
		      "events": 2
		    }
				*/
				// `tag_columns` will be a list of lists, each containing no more than three tags
				var subject_tag_columns = [],
						chunk = 3;

				if (unnestedObj.subject_tags_full){
					for (var i = 0; i < unnestedObj.subject_tags_full.length; i += chunk) {
						subject_tag_columns.push( unnestedObj.subject_tags_full.slice(i,i+chunk) );
					}
				}

				// This on the object, which will either be an empty array or one with our groups
				unnestedObj.subject_tags_grouped = subject_tag_columns;

				var impact_tag_columns = [];

				if (unnestedObj.impact_tags_full){

					// Impact tags need more nesting. It makes most sense to group them by category
					// These tags look like this and they're found under `impact_tags_full`.
					/*
					{
			      "category": "change",
			      "articles": 2,
			      "domain": "propalpatine.org",
			      "name": "legislative impact",
			      "level": "Institution",
			      "color": "#fb8072",
			      "events": 2, 
			      "id": 1
			    }
					*/
					impact_tag_columns = d3.nest()
						.key(function(d) { return d.category; })
			 			.entries(unnestedObj.impact_tags_full);
				}

				unnestedObj.impact_tags_grouped = impact_tag_columns;

				// // Next by tag category
				// unnestedObj.qual_metrics['impact_tags'] = d3.nest()
				// 	.key(function(d) { return d.category } )
				// 	.rollup(function(list){
				// 		return {
				// 			count: list.length,
				// 			values: list
				// 		}
				// 	})
				// 	.entries(unnestedObj.qual_metrics['impact_tags'])

			return unnestedObj;
		}

	})
}