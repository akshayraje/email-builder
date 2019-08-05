/**
 * eBuilder version 2.3
 */

;
(function (window, $) {

    "use strict";

    window.editedHTML = false;

    var eb = {

        i18n: null,
        attributes: [],
        globalPlaceholders: [],
        aceEditor: false,
        dockerState: true,
        dockerWidth: 440,
        saveUrl: '/',
        activeTextEditor: null,

        init: function (config) {
            eb.redirect_url = config.redirect_url;
            eb.saveUrl = config.save_url;
            eb.i18n = config.i18n;
            eb.attributes = config.attributes;
            eb.globalPlaceholders = config.global_placeholders;
            eb.campaign_gallery_config = config.campaign_gallery_config;
            eb.file_data_based_on_extension = config.file_data_based_on_extension;
            eb.onLoad($, config);
            eb.setDDSR();
            eb.bindActions();
            eb.saveAndNextBtnsAction();
            eb.$.builderContainer.show();
        },

        onLoad: function ($, config) {

            eb.jqCache($);

            eb.$.builderControls.resizable({
                resizeHeight: false,
                handles: 'e',
                maxWidth: 575,
                minWidth: 440,
                zIndex: 1001,
                resize: function (event, ui) {
                    var currentWidth = ui.size.width;
                    var padding = 5;
                    var containerWidth = eb.$.builderContainer.width();
                    $(this).width(currentWidth);
                    eb.$.builderPreview.width(containerWidth - currentWidth - padding);
                    //if($(this).width() === 440) eb.builderControlsResize();
                },
                create: function (event, ui) {
                    $(event.target).find('.ui-resizable-e')
                        .addClass("pepo-icon builder-page-slider-icon builder-page-slider-icon-placement ")
                        .on('click', eb.resizeBuilderControls);

                }
            });

            eb.freezeAnchorClick();
            eb.resize();
            eb.initPageSettings();

        },

        uid: function () {
            return 'id' + (Date.now() + Math.random()).toString(32).replace('.','')
        },

        jqCache: function ($) {

            eb.jqs = {
                content: "[data-type='content']",
                contentTemplate: "[data-type='content-template']",
                contentContainer: "[data-type='content-container']",
                layout: "[data-type='layout']",
                layoutTemplate: "[data-type='layout-template']",
                layoutContainer: "[data-type='layout-container']",
                body: "[data-type='body']",
                structure: "[data-type='structure']",
                layoutActions: ".layout-actions",
                contentActions: ".content-actions",
                layoutHandle: ".layout-handle",
                editor: "[data-type='editor']",
                editorControl: "[data-type='editor-control']",
                socialLogo: "[data-type='social-logo']",
                socialInput: "[data-type='social-input']",
                logoStyle: "[data-type='logo-style']",
                editorContainer: "#content-editor-container",
                pageSettingsContainer: ".controls-page-settings",
                builderControlsContent: ".builder-controls.tab-content",
                builderPreview: "#builder-preview",
                socialFieldWrapper: "#social-field-wrapper",
                socialError: "#social-error",
                browserViewWrapper: '#browser-view-wrapper',
                browserViewSetting: '#browser-view-setting'
            };

            eb.$ = {
                builderControls: $('#builder-controls'),
                builderPreview: $('#builder-preview'),
                previewContainer: $('#builder-preview .preview-container'),
                builderContainer: $('#builder-container'),
                socialField: $('#social-field'),
                socialLogo: $('#social-logo'),
            };

        },

        resizeBuilderControls: function () {
            if (eb.dockerState === true) {
                var currPreviewWidth = eb.$.builderPreview.width();
                eb.dockerWidth = eb.$.builderControls.width();
                eb.$.builderControls
                    .width(0)
                    .find('.tab-container')
                    .hide();
                eb.$.builderControls
                    .find('.ui-resizable-e')
                    .addClass('pepo-template-builder-icon ipad-widget-view ipad-widget-icon-placement')
                    .removeClass('pepo-icon builder-page-slider-icon builder-page-slider-icon-placement');
                $(eb.jqs.editorContainer).hide();
                var newWidth = eb.$.builderControls.width();
                eb.$.builderPreview.width(currPreviewWidth + (eb.dockerWidth - newWidth));
                eb.dockerState = false;
            } else {
                var currPreviewWidth = eb.$.builderPreview.width();
                eb.$.builderControls
                    .width(eb.dockerWidth)
                    .find('.tab-container')
                    .show();
                eb.$.builderControls
                    .find('.ui-resizable-e')
                    .removeClass('pepo-template-builder-icon ipad-widget-view ipad-widget-icon-placement')
                    .addClass('pepo-icon builder-page-slider-icon builder-page-slider-icon-placement');
                $(eb.jqs.editorContainer).show();
                eb.$.builderPreview.width(currPreviewWidth - (eb.dockerWidth));
                eb.dockerState = true;
            }
        },

        resize: function () {

            var screenWidth = $(window).width();
            var screenHeight = $(window).height();
            var minSize = 384;
            var maxSize = 768;
            var size = Math.max((screenWidth / 3), minSize); // 1/3rd of screenWidth or minSize whichever more
            var buffer = 5;

            eb.$.builderControls
                .height(Math.round(screenHeight - 100))
                .width(Math.round(size));

            $(eb.jqs.builderControlsContent)
                .height(Math.round(screenHeight - 180));

            eb.$.builderPreview
                .height(Math.round(screenHeight - 100))
                .width(Math.round(screenWidth - size - buffer));

            if (typeof eb.aceEditor !== 'boolean') {
                eb.aceEditor.setOptions({
                    minLines: Math.round(($(window).height() - 230) / 17),
                    maxLines: Math.round(($(window).height() - 230) / 17)
                });
            }

        },

        freezeAnchorClick: function () {
            $(eb.jqs.body).on('click', 'a', function (event) {
                event.preventDefault();
            });
        },

        setFormBinding: function (container, name, id) {
            if (container == eb.jqs.editorContainer) {

                $(container)
                    .unbind()
                    .html(
                        Mustache.to_html('<div class="content-editor" data-type="editor" data-for="{{{id}}}" data-name="{{{name}}}">{{{html}}}</div>', {
                            name: name,
                            html: $('#editor-' + name).html(),
                            id: id
                        })
                );

                $('#editor-save').on('click', function () {
                    eb.editorContainerDo('close');
                });

            } else {

                $(container + ' [data-name="body"]').attr('data-for', id);

            }
        },

        getElementData: function (id) {

            var data = {};
            var value = '';

            $("[data-for='" + id + "']").find(eb.jqs.editorControl).each(function (i, e) {

                if (typeof data[$(e).data('selector')] == 'undefined') {
                    data[$(e).data('selector')] = {};
                }

                if (typeof data[$(e).data('selector')][$(e).data('category')] == 'undefined') {
                    data[$(e).data('selector')][$(e).data('category')] = {};
                }

                if (typeof data[$(e).data('selector')][$(e).data('category')][$(e).data('key')] == 'undefined') {
                    data[$(e).data('selector')][$(e).data('category')][$(e).data('key')] = {};
                }

                if(typeof $(e).data('selector') === 'undefined'){
                    return;
                }

                var elem = '#' + id + ' ' + $(e).data('selector');
                elem = elem.trim();

                if ($(elem).length > 0) {

                    if ($(e).data('category') == 'content') {
                        if ($(e).data('key') == 'text') {
                            value = $(elem).text().trim();
                        }
                        if ($(e).data('key') == 'html') {
                            value = $(elem).html().trim();
                        }
                    }

                    if ($(e).data('category') == 'style') {
                        value = $(elem).css($(e).data('key')).trim();
                    }

                    if ($(e).data('category') == 'attribute') {
                        value = $(elem).attr($(e).data('key')).trim();
                    }

                    data[$(e).data('selector')][$(e).data('category')][$(e).data('key')] = value;

                } else {

                    console.warn('Something wrong with selector-form binding of '+elem+'. Recheck your saved template.')

                }

            });

            return data;

        },

        setFormData: function (elementData) {

            $.each(elementData, function (i1, v1) {
                $.each(v1, function (i2, v2) {
                    $.each(v2, function (i3, v3) {
                        var val = elementData[i1][i2][i3];
                        if (i3.toLowerCase().indexOf("color") > -1) {
                            val = eb.rgb2Hex(elementData[i1][i2][i3]);
                        }
                        if (i3.toLowerCase().indexOf("width") > -1 && i1.toLowerCase().slice(-3) === 'img') {
                            var forId = '#' + $(eb.jqs.editor + "[data-name='image']").data('for');
                            var width = $(forId + ' ' + i1).width();
                            var parentWidth = $(forId + ' ' + i1).closest('span').width();
                            val = eb.roundPrecision(100*width/parentWidth, 1)+'%';
                        }
                        if (val == 'NaN%'){
                            val = elementData[i1][i2][i3];
                        }
                        $("[data-selector='" + i1 + "'][data-category='" + i2 + "'][data-key='" + i3 + "']").val(val);
                    });
                });
            });

        },

        setElementData: function (id, caller) {

            $("[data-for='" + id + "']").find($(caller)).each(function (i, e) {

                var elem = '#' + id + ' ' + $(e).data('selector');

                if ($(e).data('category') == 'content') {
                    if ($(e).data('key') == 'text') {
                        $(elem).text($(e).val());
                    }
                    if ($(e).data('key') == 'html') {
                        $(elem).html($(e).val());
                    }
                }

                if ($(e).data('category') == 'style') {
                    $(elem).css($(e).data('key'), $(e).val());
                }

                if ($(e).data('category') == 'attribute') {
                    $(elem).attr($(e).data('key'), $(e).val());
                }

            });

        },

        setDDSR: function () {

            var draggableTemplateOpts = {
                cursor: 'move',
                helper: 'clone',
                opacity: 0.7,
                zIndex: 2002,
                start: function (event, ui) {
                    $(eb.jqs.builderControlsContent).css('overflow-y', 'visible')
                },
                stop: function (event, ui) {
                    $(eb.jqs.builderControlsContent).css('overflow-y', 'scroll')
                }
            };

            var draggableLayoutTemplateOpts = $.extend(true, {}, draggableTemplateOpts, {connectToSortable: eb.jqs.layoutContainer});

            var draggableContentTemplateOpts = $.extend(true, {}, draggableTemplateOpts, {connectToSortable: eb.jqs.contentContainer});

            var draggableContentOpts = {
                containment: false,
                cursor: 'move',
                helper: 'original',
                zIndex: 2001,
                opacity: 1,
                revert: 'invalid',
                connectToSortable: eb.jqs.contentContainer
            };

            var sortableLayoutOpts = {
                forcePlaceholderSize: true,
                containment: 'parent',
                items: '> ' + eb.jqs.layout,
                opacity: 0.7,
                revert: 100,
                placeholder: 'sortable-highlight',
                zIndex: 2000,
                tolerance: 'pointer',
                stop: function (event, ui) {
                    $(ui.item).removeAttr('style');
                    window.editedHTML = true;
                },
                receive: function (event, ui) {
                    var html = [];
                    var id = eb.uid();
                    var innerHTML = Mustache.to_html($('#template-html-' + $(ui.item).data('name')).html(), {id: id});
                    $(this).find(eb.jqs.layoutTemplate).each(function () {
                        html.push(eb.applyPageSettings(innerHTML));
                    });
                    $(this).find(eb.jqs.layoutTemplate).replaceWith(html.join(''));
                    $('#'+id).find(eb.jqs.contentContainer).addClass('empty');
                    $(this).find(eb.jqs.contentContainer).sortable(sortableContentOpts).resizable(resizableContentContainerOpts);
                    window.editedHTML = true;
                }
            };

            var sortableContentOpts = {
                forcePlaceholderSize: true,
                containment: false,
                items: '> ' + eb.jqs.content,
                opacity: 0.7,
                revert: 100,
                helper: 'original',
                placeholder: 'sortable-highlight',
                zIndex: 2001,
                tolerance: 'pointer',
                stop: function (event, ui) {
                    $(ui.item).removeAttr('style');
                    $(ui.item).css('position', 'relative');
                    window.editedHTML = true;
                },
                receive: function (event, ui) {
                    $(this)
                        .removeClass('drop-hover')
                        .find('p.dch').remove();
                    var html = [];
                    var id = eb.uid();
                    var innerHTML = Mustache.to_html($('#template-html-' + $(ui.item).data('name')).html(), {id: id});
                    $(this).find(eb.jqs.contentTemplate).each(function () {
                        html.push(innerHTML);
                    });
                    $(this).find(eb.jqs.contentTemplate).replaceWith(html.join(''));
                    $(this).closest(eb.jqs.contentContainer).removeClass('empty');
                    $(this).closest(eb.jqs.contentContainer).sortable(sortableContentOpts);
                    $('#' + id).draggable(draggableContentOpts);
                    window.editedHTML = true;
                }
            };

            var resizableContentContainerOpts = {
                handles: 'e',
                create: function (event, ui) {
                    ( ['single', '2-2-center', '3-3'].indexOf($(event.target).closest(eb.jqs.layout).data('name')) >= 0) ? $(event.target).closest(eb.jqs.contentContainer).resizable('destroy') : false;
                }
            };

            $(eb.jqs.layoutTemplate).draggable(draggableLayoutTemplateOpts);
            $(eb.jqs.contentTemplate).draggable(draggableContentTemplateOpts);
            $(eb.jqs.content).draggable(draggableContentOpts);

            $(eb.jqs.layoutContainer).sortable(sortableLayoutOpts);
            $(eb.jqs.contentContainer).sortable(sortableContentOpts).resizable(resizableContentContainerOpts);

        },

        roundPrecision: function(number, precision) {
            var factor = Math.pow(10, precision);
            var tempNumber = number * factor;
            var roundedTempNumber = Math.round(tempNumber);
            return roundedTempNumber / factor;
        },

        initPageSettings: function () {

            eb.$.body = $(eb.jqs.body);

            eb.setFormBinding(eb.jqs.pageSettingsContainer, eb.$.body.data('name'), eb.$.body.attr('id'));
            eb.setFormData(eb.getElementData(eb.$.body.attr('id')));
            eb.initColorPicker('input[type="text"].spectrum');
            eb.initSelectPicker('[data-type="editor-control"].selectpicker');
            eb.initBrowserView();

            $(eb.jqs.editorControl).on('keyup change', function (event) {
                eb.formDataOnChange(event, this);
            });

        },

        applyPageSettings: function (layoutHtml) {

            var appliedjq = $(layoutHtml);
            var bodyData = eb.getElementData(eb.$.body.attr('id'))['[data-type="structure"]'];
            $.each(bodyData.style, function (key, value) {
                appliedjq.find(eb.jqs.structure).css(key, value);
            });
            if (appliedjq.data('name') === '2-2-center') {
                appliedjq.find(eb.jqs.contentContainer).width(Math.round(parseInt(appliedjq.find(eb.jqs.structure).css('max-width')) / 2));
            }
            if (appliedjq.data('name') === '3-3') {
                appliedjq.find(eb.jqs.contentContainer).width(Math.round(parseInt(appliedjq.find(eb.jqs.structure).css('max-width')) / 3));
            }
            return appliedjq[0].outerHTML;
        },

        formDataOnChange: function (event, caller) {

            $(caller).closest($(eb.jqs.editor)).find(eb.jqs.editorControl + "[data-listen-to='" + event.target.id + "']").val($('#' + event.target.id).val());
            eb.setElementData($(caller).closest($(eb.jqs.editor)).data('for'), caller);

            $(caller).closest($(eb.jqs.editor)).find(eb.jqs.editorControl + "[data-listen-to='" + event.target.id + "'], " + eb.jqs.editorControl + "[data-update-with='" + event.target.id + "']").each(function(index){
                eb.setElementData($(caller).closest($(eb.jqs.editor)).data('for'), this);
            });

        },

        reset: function (action) {
            if (action === 'content') {
                $(eb.jqs.content).removeClass('active');
                $(eb.jqs.content).find(eb.jqs.contentActions).remove();
            }
            if (action === 'layout') {
                $(eb.jqs.layout).removeClass('active');
                $(eb.jqs.layout).find(eb.jqs.layoutActions).remove();
                $(eb.jqs.layout).find(eb.jqs.layoutHandle).remove();
            }

            // Hide color pickers
            $('input[type="text"].spectrum').spectrum("hide");

            // Hide tinymce menus
            $('.mce-menu[role="application"]').hide();

            // Reset active tinymce (done here to avoid late reset bug)
            if( eb.activeTextEditor !== null )
                eb.activeTextEditor.destroy();
        },

        setup: function (action, element) {

            var $element = $(element);

            if (action === 'content') {
                $element
                    .addClass('active')
                    .append($('<div class="content-actions"><div class="inner"><span title="Edit" class="pepo-icon preview-content-edit-icon"></span> <span title="Duplicate" class="pepo-icon preview-content-duplicate-icon duplicate"></span> <span title="Delete" class="pepo-icon preview-content-delete-icon delete"></span></div></div>'));

                $(eb.jqs.contentActions).on('click', 'span.duplicate', function () {

                    var newUid = eb.uid();

                    $element
                        .closest($(eb.jqs.content))
                        .clone()
                        .attr('id', newUid)
                        .insertAfter($element.closest($(eb.jqs.content)));

                    eb.setDDSR();

                }).on('click', 'span.delete', function () {

                    eb.deleteJqObj($element);

                });

            }

            if (action === 'layout') {
                $element
                    .addClass('active')
                    .append($('<div class="layout-actions"><div class="inner"><span title="Edit" class="pepo-icon preview-content-edit-icon"></span> <span title="Duplicate" class="pepo-icon preview-content-duplicate-icon duplicate"></span> <span title="Delete" class="pepo-icon preview-content-delete-icon delete"></span></div></div>'));

                $(eb.jqs.layoutActions).on('click', 'span.duplicate', function () {

                    var newUid = eb.uid();

                    $(element)
                        .closest($(eb.jqs.layout))
                        .clone()
                        .attr('id', newUid)
                        .insertAfter($element.closest($(eb.jqs.layout)));
                    $('#'+newUid)
                        .find(eb.jqs.content).each(function (index) {
                            $(this).attr('id', eb.uid());
                        });

                    eb.setDDSR();

                }).on('click', 'span.delete', function () {

                    eb.deleteJqObj($element);

                });

            }

        },

        deleteJqObj: function (jQ) {
            $.bootModal(
                eb.i18n.confirm,
                eb.i18n.modal_remove_confirm_msg,
                {
                    footer: true,
                    primaryText: eb.i18n.cancel,
                    secondaryText: eb.i18n.delete,
                    secondaryCallback: function () {
                        if(jQ.closest(eb.jqs.contentContainer).children(eb.jqs.content).length == 1){
                            jQ.closest(eb.jqs.contentContainer).addClass('empty');
                        }
                        jQ.remove();
                        eb.editorContainerDo('close');
                    }
                }
            );
        },

        editorContainerDo: function (action) {
            if (action === 'open') {
                $(eb.jqs.editorContainer).animate({
                    left: '0',
                }, 300);
                window.editedHTML = true;
            }
            if (action === 'close') {
                $(eb.jqs.editorContainer).animate({
                    left: '-98%',
                }, 300);
            }
        },

        initTextEditor: function (selector) {

            if ($(selector).length > 0) {
                tinymce.init({
                    selector: selector,
                    menubar: false,
                    statusbar: false,
                    plugins: [
                        'link textcolor colorpicker code_toggle'
                    ],
                    toolbar_item_size: "small",
                    forced_root_block: false,
                    extended_valid_elements: "*[*]",
                    toolbar1: 'fontselect fontsizeselect attributes_button',
                    toolbar2: $(selector).data('toolbar'),
                    fontsize_formats: '8pt 10pt 11pt 12pt 14pt 18pt 24pt 36pt',
                    height : 300,
                    setup: function (editor) {
                        editor.addButton('attributes_button', {
                            type: 'listbox',
                            text: eb.i18n.attributes_lbl,
                            tooltip: eb.i18n.attributes_lbl,
                            icon: false,
                            onselect: function (e) {
                                editor.insertContent(this.value());
                                this.text(eb.i18n.attributes_lbl);
                            },
                            values: eb.attributes
                        });
                        editor.on('keyup change', function () {
                            $(selector)
                                .val(tinymce.activeEditor.getContent())
                                .trigger('keyup');
                        });
                        eb.activeTextEditor = editor;
                    }
                });
            }
        },

        initCodeEditor: function (id) {
            if ($('#' + id).length > 0) {
                var textarea = $('textarea.ace').hide();
                eb.aceEditor = ace.edit(id);
                eb.aceEditor.$blockScrolling = 'Infinity';
                eb.aceEditor.setTheme("ace/theme/chrome");
                eb.aceEditor.session.setMode("ace/mode/html_ruby");
                eb.aceEditor.setValue(textarea.val(), 1);
                eb.aceEditor.setOptions({
                    wrap: true,
                    displayIndentGuides: true,
                    highlightActiveLine: false,
                    showPrintMargin: false,
                    minLines: Math.round(($(window).height() - 230) / 17),
                    maxLines: Math.round(($(window).height() - 230) / 17)
                });
                eb.aceEditor.on('change', function () {
                    textarea.val(eb.aceEditor.getValue()).trigger('keyup');
                });
            }
        },

        initColorPicker: function (selector) {

            if ($(selector).length > 0) {
                $(selector).spectrum({
                    showInput: true,
                    showInitial: true,
                    showPalette: true,
                    allowEmpty: true,
                    clickoutFiresChange: true,
                    showSelectionPalette: true,
                    hideAfterPaletteSelect: true,
                    maxSelectionSize: 8,
                    chooseText: 'Choose',
                    cancelText: eb.i18n.cancel,
                    preferredFormat: "hex",
                    palette: [
                        ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
                        ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
                        ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
                        ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
                        ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
                        ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
                        ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
                        ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
                    ]
                });
                $(selector)
                    .show()
                    .css('display', 'inline-block');
                $('.sp-dd')
                    .addClass('glyphicon glyphicon-menu-down')
                    .text('');
            }
        },

        initGallery: function (selector) {

            if ($(selector).length > 0) {

                var galleryImgUrl = $('#gallery-img-url');
                var imagePreview = $('#image-control-preview');
                var imageName = $('#image-control-name');
                var imageSize = $('#image-control-size');
                var imageWidth = $('#width-pc-width');
                var imageMaxWidth = $('#width-pc-max-width');

                var updateImage = function (imageInput) {
                    var newImg = new Image();
                    newImg.src = imageInput.val();
                    newImg.onload = function () {
                        imagePreview.attr('src', imageInput.val());
                        imageSize.text(newImg.width + ' x ' + newImg.height + ' px');
                        imageMaxWidth.val(newImg.width + 'px');
                        imageName.text(imageInput.data('name'));
                        //imageMaxWidth.trigger('keyup');
                    };
                };

                updateImage(galleryImgUrl);

                galleryImgUrl.on('keyup change', function (event) {
                    updateImage(galleryImgUrl);
                });
            }

            if ($('#gallery-show').length > 0) {

                var galleryConfig = eb.campaign_gallery_config;
                galleryConfig.ajax.data.source = $('#gallery-show').data('source');

                $('#gallery-show').on('click', function () {
                    pepo.campaign_gallery.gallery.init({
                        campaign_gallery_config: galleryConfig,
                        file_data_based_on_extension: eb.file_data_based_on_extension,
                        source: 'template_builder',
                        i18n: eb.i18n,
                    });
                    $('#image-gallery-overlay').show();
                    $('#site-content').hide();
                });

            }

        },

        initSelectPicker: function (selector) {

            if ($(selector).length > 0) {

                $(selector).selectpicker({
                    style: 'btn-default btn-pepo',
                    size: 5,
                    template: {
                        caret: '<span class="glyphicon glyphicon-menu-down"></span>'
                    },
                });

            }
        },

        initSocialIcons: function (selector, id) {

            if ($(selector).length > 0) {

                var refreshSocial = function(id){
                    // Remove all from content
                    $('#'+id).find(eb.jqs.socialLogo).remove();

                    // Iterate and add to content
                    $(eb.jqs.socialFieldWrapper).find(eb.jqs.socialInput).each(function(){
                        var content = $(this).data('content');
                        var selector = 'table.wrapper td:first';
                        var href = $(this).find(eb.jqs.editorControl).val();
                        var style = $('#logo-style').val();
                        var logourl = $(eb.jqs.logoStyle+'[data-content="'+style+'"] '+eb.jqs.socialLogo+"[data-content='"+content+"']").data('logourl');
                        var size = $('#logo-size').val();
                        $('#'+id+' '+selector).append(Mustache.to_html(eb.$.socialLogo.html(), {content: content, href: href, logourl: logourl, size: size}));
                    });
                };

                var addRemoveInputs = function(content, style){
                    var existingContent = $(eb.jqs.socialFieldWrapper).find(eb.jqs.socialInput+"[data-content='"+content+"']");
                    $(eb.jqs.socialLogo).find('.pepo-icon.social-logo-uncheck').switchClass('social-logo-uncheck', 'social-logo-check', 1);

                    // Update form
                    if( existingContent.length > 0 ){
                        // Remove
                        if($(eb.jqs.socialFieldWrapper).find(eb.jqs.socialInput).length > 1){
                            $(eb.jqs.socialLogo+"[data-content='"+content+"']").find('.pepo-icon').removeClass('social-logo-check');
                            $(eb.jqs.socialFieldWrapper).find(eb.jqs.socialInput+"[data-content='"+content+"']").remove();
                        } else {
                            $(eb.jqs.socialLogo+"[data-content='"+content+"']").find('.pepo-icon').switchClass('social-logo-check', 'social-logo-uncheck', 1);
                            $(eb.jqs.socialError).css("visibility", "visible");
                        }
                    } else {
                        // Add
                        $(eb.jqs.socialLogo+"[data-content='"+content+"']").find('.pepo-icon').addClass('social-logo-check').removeClass('social-logo-uncheck');
                        $(eb.jqs.socialError).css("visibility", "hidden");
                        $(eb.jqs.socialFieldWrapper).append(Mustache.to_html(eb.$.socialField.html(), {content: content, style: style}));
                    }
                };

                var showHideStyles = function(){
                    var style = $('#logo-style').val();
                    $(eb.jqs.logoStyle).hide();
                    $(eb.jqs.logoStyle+'[data-content="'+style+'"]').show();
                    $(eb.jqs.socialFieldWrapper).find(eb.jqs.socialInput).each(function(){
                        $(this).find('span').attr('class', 'pepo-icon social-logo-sm '+$(this).data('content')+'-'+style+'-sm');
                    });
                    return style;
                };

                showHideStyles();

                $('#'+id).find(eb.jqs.socialLogo).each(function(){
                    var content = $(this).data('content');
                    var style = $('#logo-style').val();
                    addRemoveInputs(content, style);
                });

                eb.setFormData(eb.getElementData(id));

                $(eb.jqs.logoStyle+' '+eb.jqs.socialLogo).on('click', function(){
                    var content = $(this).data('content');
                    var style = $('#logo-style').val();
                    addRemoveInputs(content, style);
                    refreshSocial(id);
                });

                $(eb.jqs.socialInput).on('change', function(){
                    refreshSocial(id);
                });

                $('#logo-style').on('change', function(){
                    showHideStyles();
                    refreshSocial(id);
                });

            }

        },

        initBrowserView: function(){

            $(eb.jqs.browserViewSetting).prop('checked', Boolean($(eb.jqs.browserViewWrapper).length));

            $(eb.jqs.browserViewSetting).change(function() {
                if($(this).is(":checked")) {
                    var innerHTML = Mustache.to_html($('#template-html-browser-view-text').html());
                    $(eb.jqs.contentContainer).first().prepend(innerHTML);
                    eb.setDDSR();
                } else {
                    $(eb.jqs.browserViewWrapper).remove();
                }
            });

        },

        rgb2Hex: function (rgb) {

            if (rgb == '') rgb = 'rgb(0, 0, 0)';
            if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;
            if (rgb.toLowerCase() === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return 'transparent';

            rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            function hex(x) {
                return ("0" + parseInt(x).toString(16)).slice(-2);
            }

            return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
        },

        getEBuilderData: function () {

            // Destroy DDSR
            ($(eb.jqs.content).data('ui-draggable')) ? $(eb.jqs.content).draggable('destroy') : false;
            ($(eb.jqs.layoutContainer).data('ui-sortable')) ? $(eb.jqs.layoutContainer).sortable('destroy') : false;
            ($(eb.jqs.contentContainer).data('ui-sortable')) ? $(eb.jqs.contentContainer).sortable('destroy') : false;
            ($(eb.jqs.contentContainer).data('ui-resizable')) ? $(eb.jqs.contentContainer).resizable('destroy') : false;

            eb.reset('content');
            eb.reset('layout');
            eb.editorContainerDo('close');

            var html = eb.$.previewContainer.html().trim().replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/igm, function (rgb) {
                return eb.rgb2Hex(rgb);
            });

            return html;

        },

        bindActions: function () {

            $('[data-toggle="popover"]').popover({
              html: true,
              placement: 'bottom'
            });

            $('[data-toggle="popover2"]').popover({
              html: true,
              placement: 'top'
            });

            $(eb.jqs.body).on('click', eb.jqs.content, function (event) {

                eb.reset('content');
                eb.reset('layout');
                eb.setup('content', this);

                eb.setFormBinding(eb.jqs.editorContainer, $(this).data('name'), $(this).attr('id'));
                eb.setFormData(eb.getElementData($(this).attr('id')));

                eb.initTextEditor('textarea.tinymce');
                eb.initCodeEditor('ace-editor');
                eb.initColorPicker('input[type="text"].spectrum');
                eb.initGallery('#image-control-preview');
                eb.initSelectPicker('[data-type="editor-control"].selectpicker');
                eb.initSocialIcons('#social-field-wrapper', $(this).attr('id'));

                eb.editorContainerDo('open');

                $(eb.jqs.editorContainer).on('keyup change', eb.jqs.editorControl, function (event) {
                    eb.formDataOnChange(event, this);
                });

                event.stopPropagation();
            });

            $(eb.jqs.body).on('click', eb.jqs.layout, function (event) {

                eb.reset('content');
                eb.reset('layout');
                eb.setup('layout', this);

                eb.setFormBinding(eb.jqs.editorContainer, $(this).data('name'), $(this).attr('id'));
                eb.setFormData(eb.getElementData($(this).attr('id')));

                eb.initColorPicker('input[type="text"].spectrum');

                eb.editorContainerDo('open');

                $(eb.jqs.editorContainer).on('keyup change', eb.jqs.editorControl, function (event) {
                    eb.formDataOnChange(event, this);
                });

                event.stopPropagation();

            });

            $(eb.jqs.body).on('mouseenter', eb.jqs.layout, function(){

                var height = $(this).height();
                var margin = ((height / 2) + 20) * -1;
                $(this).append($('<div class="layout-handle"><span class="pepo-icon preview-content-mover-icon"></span></div>'));
                $(this).find(eb.jqs.layoutHandle).css('margin-top', margin + 'px');

            }).on('mouseleave', eb.jqs.layout, function(){

                $(this).find(eb.jqs.layoutHandle).remove();

            });

            $(eb.jqs.body).on('click', function (event) {

                eb.reset('content');
                eb.reset('layout');
                eb.editorContainerDo('close');

                $('.pepo-page-tabs a[href=".controls-page-settings"]').tab('show');

            });

        },

        updateBody: function (sanitized_body) {
            eb.$.previewContainer.html(sanitized_body);
            eb.setDDSR();
            eb.bindActions();
            eb.freezeAnchorClick();
            window.editedHTML = false;
        },

        executeNextFunction: function (nextFunction, response) {
            switch (nextFunction) {
                case 'test_send':
                    eb.testSendStart();
                    break;
                case 'preview':
                    eb.previewModalOpen();
                    break;
                case 'data_feed':
                    eb.dataFeedModalOpen();
                    break;
                default:
                    pepo.utils.common.showAlert(response);
            }
        },

        saveBody: function (nextFunction) {
            $.ajax({
                url: eb.saveUrl,
                dataType: 'json',
                data: {
                    'body': eb.getEBuilderData(),
                    'page_name': 'design'
                },
                method: 'POST',
                success: function (response) {
                    if (response.success == true) {
                        eb.updateBody(response.sanitized_body);
                        eb.executeNextFunction(nextFunction, response);
                    }
                    else {
                        pepo.utils.common.showAlert(response);
                        eb.setDDSR();
                        eb.bindActions();
                    }
                },
                error: function (response) {
                    pepo.utils.common.showAlert(response);
                }
            });
        },

        testSendStart: function () {
            pepo.campaign_main.index.testMailModalBox();
        },

        previewModalOpen: function () {
            pepo.campaign_views.views.advancedViewsOverlay();
        },

        dataFeedModalOpen: function(){
            pepo.campaign_datafeed.index.dataFeedOverlay();
        },

        saveAndNextBtnsAction: function () {

            // Save Button ID => #saveEditorData-1
            // Next Button ID => #saveEditorData-2

            $('#saveEditorData-1').on('click', function () {
                eb.saveBody();
            });

            $('#advanced-views-show').on('click', function () {
                eb.saveBody('preview');
            });

            $('#testMailModal').on('click', function () {
                eb.saveBody('test_send');
            });

            $('#data-feed-show').on('click', function () {
                eb.saveBody('data_feed');
            });

            $('#saveEditorData-2').on('click', function () {

                $.ajax({
                    url: eb.saveUrl,
                    dataType: 'json',
                    data: {
                        'body': eb.getEBuilderData(),
                        'page_name': 'design'
                    },
                    method: 'POST',
                    success: function (response) {
                        if (response.success == true) {
                            window.location = eb.redirect_url;
                        }
                        else {
                            pepo.utils.common.showAlert(response);
                        }
                    },
                    error: function (response) {
                        pepo.utils.common.showAlert(response);
                        eb.setDDSR();
                        eb.freezeAnchorClick();
                    }
                });
            });
        },

    };

    if (typeof eb === 'undefined') {
        window.eBuilder = {};
    } else {
        window.eBuilder = eb;
    }

    $(window).resize(function () {
        window.eBuilder.resize();
    });

}(window, jQuery));

/*
 * TinyMCE code_toggle plugin
 */
tinymce.PluginManager.add('code_toggle', function(editor, url) {

    editor.addButton('code_toggle', {
        icon: 'code',
        text: 'Code',
        tooltip: 'Code',
        onclick: function (e) {
            toggleCode(this, editor);
        }
    });

    $('#'+editor.id).on('change', function(){
        editor.setContent($(this).val());
    });

    var toggleCode = function(elem, editor){

        elem.active( !elem.active() );
        var state = elem.active();
        var self = elem.$el;
        var tinymce = $(self).closest('.mce-tinymce');
        var aceID = 'ace-editor-'+editor.id;

        if (state){

            // Code mode
            tinymce.find('.mce-widget.mce-btn').each(function(){
                if($(this).attr('id') !== $(elem.$el).attr('id')){
                    $(this).css({
                        'pointer-events': 'none',
                        'opacity': '0.4'
                    });
                }
            });
            tinymce.find('.mce-edit-area').hide();
            $('#'+editor.id)
                .css('height', $(editor.getDoc()).height()+'px')
                .show();

            if(typeof ace !== 'undefined'){

                var textarea = $('#'+editor.id).hide();
                $('#'+editor.id).after('<div id="'+aceID+'"></div>');
                var aceEditor = ace.edit(aceID);

                aceEditor.$blockScrolling = 'Infinity';
                aceEditor.setTheme("ace/theme/chrome");
                aceEditor.session.setMode("ace/mode/html_ruby");
                aceEditor.setValue(textarea.val(), 1);
                aceEditor.setOptions({
                    wrap: true,
                    displayIndentGuides: true,
                    highlightActiveLine: false,
                    showPrintMargin: false,
                    minLines: Math.round(300 / 17),
                    maxLines: Math.round(300 / 17)
                });
                aceEditor.on('change', function () {
                    textarea.val(aceEditor.getValue()).trigger('keyup');
                    editor.setContent(aceEditor.getValue());
                });
            }

        } else {

            // Editor mode
            tinymce.find('.mce-widget.mce-btn').each(function(){
                if($(this).attr('id') !== $(elem.$el).attr('id')) {
                    $(this).css({
                        'pointer-events': 'auto',
                        'opacity': '1'
                    });
                }
            });
            tinymce.find('.mce-edit-area').show();
            $('#'+editor.id)
                .hide();

            if(typeof ace !== 'undefined'){

                var aceEditor = ace.edit(aceID);
                aceEditor.destroy();
                $('#'+aceID).remove();

            }
        }
    };
});