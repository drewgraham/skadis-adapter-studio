/*
  Parametric IKEA SKADIS adapter for objects with keyhole pegs and feet.
  Units: millimetres. Front/object side is +Z; the rear face is Z=0.

  The default values reproduce the physically measured WORX WA3869 layout.
  Select one output at a time with `part` and press F6 before exporting STL.
*/

/* [Output] */
part = "adapter"; // [adapter,peg_coupon,foot_coupon,tclip_coupon]
base_style = "linked"; // [linked,full]
layout_mode = "symmetric"; // [symmetric,custom]

/* [Simple symmetric object layout] */
peg_center_spacing = 89;
foot_centres_x = 148.25;
foot_centres_y = 92.9;
foot_above_seated_peg = 9.8; // foot row centre above seated peg row

/* [Keyhole peg interface] */
peg_shaft_diameter = 5.2;
peg_head_diameter = 8.5;
peg_head_thickness = 2.0;
peg_protrusion = 5.0; // plate face to outer face of peg head
peg_root_fillet = 0.8;
peg_head_underside_chamfer = 1.2;
peg_head_top_chamfer = 0.25;

/* [Round foot interface] */
foot_diameter = 12.12;
foot_radial_clearance = 0.4;
foot_bottom_extra_clearance = 1.2;
cradle_wall = 2.0;
cradle_depth = 3.4; // how far the cradle projects from the base
cradle_mouth_chamfer = 0.5;
cradle_open_length = 8.5;
cradle_rotation = 0; // degrees; 0 opens toward +Y

/* [SKADIS T-Clip system] */
// Default positions are on the 40 mm SKADIS grid and match the peg row.
clip_top_half_spacing = 20;
clip_lower_half_spacing = 60;
clip_lower_drop = 40;
skadis_grid_pitch = 40;
validate_clip_grid = true;
tclip_seat_diameter = 28.284;
tclip_press_overlap = 0.30;
tclip_seat_file = "tclip_clip_seat.stl";

/* [Base] */
plate_thickness = 5.4; // required for the original T-Clip seat to finish flush
clip_pad_radius = 18;
foot_pad_radius = 10.5;
peg_pad_radius = max(7,peg_head_diameter/2+2);
cradle_base_margin = 2;
full_base_margin = 18;
full_base_corner_radius = 7;

/* [Fit-test coupons] */
coupon_base_thickness = 2.0;
peg_coupon_size = 20;
foot_coupon_width = 26;
foot_coupon_height = 31;
tclip_coupon_size = 38;

/* [Custom layout - used only when layout_mode is custom] */
// Coordinates are [X,Y], with the desired seated peg-row centre normally Y=0.
custom_peg_positions = [[-44.5,0],[44.5,0]];
custom_foot_positions = [[-74.125,9.8],[74.125,9.8],[-74.125,-83.1],[74.125,-83.1]];
custom_tclip_positions = [[-20,0],[20,0],[-60,-40],[60,-40]];
// Each link is [point A, point B, radius at A, radius at B].
custom_frame_links = [
    [[-74.125,9.8],[-20,0],10.5,18],
    [[-20,0],[20,0],18,18],
    [[20,0],[74.125,9.8],18,10.5],
    [[-74.125,9.8],[-60,-40],10.5,18],
    [[-60,-40],[-74.125,-83.1],18,10.5],
    [[74.125,9.8],[60,-40],10.5,18],
    [[60,-40],[74.125,-83.1],18,10.5]
];

/* [Hidden] */
$fn = 64;
join_overlap = 0.2;
eps = 0.01;
peg_row_y = 0;
foot_top_y = foot_above_seated_peg;
foot_bottom_y = foot_top_y-foot_centres_y;

symmetric_peg_positions = [
    [-peg_center_spacing/2,peg_row_y],
    [ peg_center_spacing/2,peg_row_y]
];
symmetric_foot_positions = [
    [-foot_centres_x/2,foot_top_y],
    [ foot_centres_x/2,foot_top_y],
    [-foot_centres_x/2,foot_bottom_y],
    [ foot_centres_x/2,foot_bottom_y]
];
symmetric_tclip_positions = [
    [-clip_top_half_spacing,peg_row_y],
    [ clip_top_half_spacing,peg_row_y],
    [-clip_lower_half_spacing,peg_row_y-clip_lower_drop],
    [ clip_lower_half_spacing,peg_row_y-clip_lower_drop]
];
symmetric_frame_links = [
    [symmetric_foot_positions[0],symmetric_tclip_positions[0],foot_pad_radius,clip_pad_radius],
    [symmetric_tclip_positions[0],symmetric_tclip_positions[1],clip_pad_radius,clip_pad_radius],
    [symmetric_tclip_positions[1],symmetric_foot_positions[1],clip_pad_radius,foot_pad_radius],
    [symmetric_foot_positions[0],symmetric_tclip_positions[2],foot_pad_radius,clip_pad_radius],
    [symmetric_tclip_positions[2],symmetric_foot_positions[2],clip_pad_radius,foot_pad_radius],
    [symmetric_foot_positions[1],symmetric_tclip_positions[3],foot_pad_radius,clip_pad_radius],
    [symmetric_tclip_positions[3],symmetric_foot_positions[3],clip_pad_radius,foot_pad_radius]
];

peg_positions = layout_mode == "symmetric" ? symmetric_peg_positions : custom_peg_positions;
foot_positions = layout_mode == "symmetric" ? symmetric_foot_positions : custom_foot_positions;
tclip_positions = layout_mode == "symmetric" ? symmetric_tclip_positions : custom_tclip_positions;
frame_links = layout_mode == "symmetric" ? symmetric_frame_links : custom_frame_links;
all_positions = concat(peg_positions,foot_positions,tclip_positions);
all_x = [for(p=all_positions) p[0]];
all_y = [for(p=all_positions) p[1]];
full_x0 = min(all_x)-full_base_margin;
full_x1 = max(all_x)+full_base_margin;
full_y0 = min(all_y)-full_base_margin;
full_y1 = max(all_y)+full_base_margin;

foot_inner_radius = foot_diameter/2+foot_radial_clearance;
foot_outer_radius = foot_inner_radius+cradle_wall;
peg_shaft_length = peg_protrusion-peg_head_thickness;

function on_grid(v) = abs(v/skadis_grid_pitch-round(v/skadis_grid_pitch)) < 0.001;

assert(part == "adapter" || part == "peg_coupon" || part == "foot_coupon" || part == "tclip_coupon",
       "part must be adapter, peg_coupon, foot_coupon or tclip_coupon");
assert(base_style == "linked" || base_style == "full", "base_style must be linked or full");
assert(layout_mode == "symmetric" || layout_mode == "custom", "layout_mode must be symmetric or custom");
assert(peg_head_diameter > peg_shaft_diameter, "peg head must be wider than its shaft");
assert(peg_protrusion > peg_head_thickness, "peg protrusion must exceed head thickness");
assert(abs(plate_thickness-5.4) < 0.01,
       "The supplied T-Clip seat is 5.4 mm deep; changing plate_thickness breaks the flush rear face");
if(validate_clip_grid && len(tclip_positions)>0)
    for(p=tclip_positions)
        assert(on_grid(p[0]-tclip_positions[0][0]) && on_grid(p[1]-tclip_positions[0][1]),
               str("T-Clip at ",p," is not on the configured SKADIS grid"));

module rounded_bounds_2d(x0,y0,x1,y1,r) {
    rr = min(r,(x1-x0)/2,(y1-y0)/2);
    hull()
        for(x=[x0+rr,x1-rr]) for(y=[y0+rr,y1-rr])
            translate([x,y]) circle(r=rr);
}

module tapered_link_2d(link) {
    hull() {
        translate(link[0]) circle(r=link[2]);
        translate(link[1]) circle(r=link[3]);
    }
}

module cradle_outer_2d(extra=0) {
    translate([0,-foot_bottom_extra_clearance]) circle(r=foot_outer_radius+extra);
    translate([-foot_outer_radius-extra,-foot_bottom_extra_clearance])
        square([2*(foot_outer_radius+extra),cradle_open_length+foot_bottom_extra_clearance+extra]);
}

module cradle_support_pad_2d() {
    rotate(cradle_rotation)
        offset(r=cradle_base_margin) cradle_outer_2d();
}

module linked_base_2d() {
    union() {
        for(link=frame_links) tapered_link_2d(link);
        for(p=tclip_positions) translate(p) circle(r=clip_pad_radius);
        for(p=peg_positions) translate(p) circle(r=peg_pad_radius);
        for(p=foot_positions) translate(p) cradle_support_pad_2d();
    }
}

module base_outline_2d() {
    if(base_style == "full")
        hull() {
            for(p=foot_positions) translate(p) cradle_support_pad_2d();
            for(p=peg_positions) translate(p) circle(r=peg_pad_radius);
            for(p=tclip_positions) translate(p) circle(r=clip_pad_radius);
        }
    else
        linked_base_2d();
}

module original_tclip_seat() {
    rotate([-90,0,0]) import(tclip_seat_file,convexity=10);
}

module base_with_tclip_seats() {
    union() {
        difference() {
            linear_extrude(plate_thickness) base_outline_2d();
            for(p=tclip_positions)
                translate([p[0],p[1],-join_overlap])
                    cylinder(h=plate_thickness+2*join_overlap,
                             d=tclip_seat_diameter-tclip_press_overlap);
        }
        for(p=tclip_positions)
            translate([p[0],p[1],0]) original_tclip_seat();
    }
}

module open_foot_pocket_2d(extra=0) {
    translate([0,-foot_bottom_extra_clearance]) {
        circle(r=foot_inner_radius+extra);
        translate([-foot_inner_radius-extra,0])
            square([2*(foot_inner_radius+extra),30]);
    }
}

module foot_cradle(base_t=plate_thickness) {
    rotate([0,0,cradle_rotation])
        translate([0,0,base_t]) difference() {
            translate([0,0,-join_overlap])
                linear_extrude(cradle_depth+join_overlap) cradle_outer_2d();
            translate([0,0,-join_overlap-eps])
                linear_extrude(cradle_depth+join_overlap+2*eps) open_foot_pocket_2d();
            hull() {
                translate([0,0,cradle_depth-cradle_mouth_chamfer])
                    linear_extrude(eps) open_foot_pocket_2d();
                translate([0,0,cradle_depth])
                    linear_extrude(eps) open_foot_pocket_2d(cradle_mouth_chamfer);
            }
        }
}

module keyhole_peg(base_t=plate_thickness) {
    root_h = min(peg_root_fillet,peg_shaft_length);
    under_c = min(peg_head_underside_chamfer,
                  peg_head_thickness-peg_head_top_chamfer-0.2);
    top_c = min(peg_head_top_chamfer,
                peg_head_thickness-under_c-0.2);
    middle_h = peg_head_thickness-under_c-top_c;
    support_start_d = min(peg_head_diameter-0.4,peg_shaft_diameter+1);
    union() {
        translate([0,0,base_t-join_overlap])
            cylinder(h=peg_shaft_length+2*join_overlap,d=peg_shaft_diameter);
        translate([0,0,base_t-join_overlap])
            cylinder(h=root_h+join_overlap,
                     d1=peg_shaft_diameter+2*peg_root_fillet,d2=peg_shaft_diameter);
        translate([0,0,base_t+peg_shaft_length]) {
            cylinder(h=under_c,d1=support_start_d,d2=peg_head_diameter);
            translate([0,0,under_c]) cylinder(h=middle_h,d=peg_head_diameter);
            translate([0,0,under_c+middle_h])
                cylinder(h=top_c,d1=peg_head_diameter,d2=peg_head_diameter-2*top_c);
        }
    }
}

module adapter() {
    union() {
        base_with_tclip_seats();
        for(p=foot_positions) translate([p[0],p[1],0]) foot_cradle();
        for(p=peg_positions) translate([p[0],p[1],0]) keyhole_peg();
    }
}

module peg_coupon() {
    union() {
        linear_extrude(coupon_base_thickness)
            rounded_bounds_2d(-peg_coupon_size/2,-peg_coupon_size/2,
                               peg_coupon_size/2,peg_coupon_size/2,2);
        keyhole_peg(coupon_base_thickness);
    }
}

module foot_coupon() {
    union() {
        linear_extrude(coupon_base_thickness)
            rounded_bounds_2d(-foot_coupon_width/2,-foot_coupon_height/2,
                               foot_coupon_width/2,foot_coupon_height/2,2);
        foot_cradle(coupon_base_thickness);
    }
}

module tclip_coupon() {
    union() {
        difference() {
            linear_extrude(plate_thickness)
                rounded_bounds_2d(-tclip_coupon_size/2,-tclip_coupon_size/2,
                                   tclip_coupon_size/2,tclip_coupon_size/2,3);
            translate([0,0,-join_overlap])
                cylinder(h=plate_thickness+2*join_overlap,
                         d=tclip_seat_diameter-tclip_press_overlap);
        }
        original_tclip_seat();
    }
}

if(part == "adapter") adapter();
else if(part == "peg_coupon") peg_coupon();
else if(part == "foot_coupon") foot_coupon();
else tclip_coupon();

