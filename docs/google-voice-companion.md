# Google Voice companion window

The Call Queue opens Google Voice as a separate, reusable browser popup. It is not an iframe and Urban Yards does not inspect or control the cross-origin Google Voice page.

Chrome may adjust or reject requested popup dimensions and coordinates. Browser chrome varies by platform, `moveTo()` and `resizeTo()` can be restricted, and multi-monitor coordinates are handled differently across operating systems. Popups must originate from a direct user click. At viewport widths below 900px, the dashboard intentionally opens a regular tab instead of attempting precise positioning.

The dashboard stores only companion-window placement preferences in local storage. Call notes and customer data are never stored there.
