

function wxas_run_slick(el, settings) {
    jQuery(el).slick(settings);
}

jQuery("document").ready(function () {





    jQuery(".wxas_slider").each(function () {
        var wxas_settings = jQuery(this).data("slide_settings");
        var wxas_el_class = jQuery(this).data("class");
        var slider_id = jQuery(this).data("id");

        var wxas_slick = jQuery("."+wxas_el_class).slick(wxas_settings);





        var wxas_container = jQuery("."+wxas_el_class).closest(".wxas_container");
        var is_touch = wxas_container.hasClass("wxas_touch");
        if(is_touch){
            jQuery("body").append('<span class="wxas_cursor wxas_cursor_'+slider_id+'"></span>');
        }
        var wxas_cursor = jQuery(".wxas_cursor_"+slider_id);
        if(wxas_cursor.length > 0){
            wxas_slick.on('mousedown touchstart', function () {
                jQuery("body").addClass('wcas_cursor_down');
            });
            wxas_slick.on('mouseleave mouseup touchend', function () {
                jQuery("body").removeClass('wcas_cursor_down');
            });


            wxas_container.find(".wxas_slide_item").on('mousemove', function(e){
                wxas_cursor.css({
                    'display':'block',
                    top: e.pageY + 'px',
                    left: e.pageX + 'px',
                })
            });
            wxas_container.find(".wxas_slide_item").on('mouseout', function(e){
                wxas_cursor.css({
                    'display':'none'
                })
            });
        }



    });




});