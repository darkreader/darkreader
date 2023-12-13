# Digital signature files

This directory contains digital signature files provided by Firefox Add-ons store and bits of metadata necessary for creating a valid signed release file. Currently only Firefox files are provided.

This information is sufficient for creating release files which are accepted by Firefox, but these files may differ from the ones published on Firefox Add-ons store. Specifically the following information is omitted because it is not checked during installation:
 - Files which we pack are always valid. Older official releases may fail to be unpacked by streaming zip readers, since archives can contain contradictory metadata about file contents (the index at the end of archive is considered authoritative in this case). Apparently Mozilla used to create slightly broken bundles, but no longer does.
 - Archives contain a timestamp field and permission flags for each file. These are not checked, make no sense in the context of released extension, and therefore omitted.
 - Archives can have different levels of compression. Firefox validates the decompressed contents, so this information is also omitted. In practice, users may want to pick different levels of compression (e.g., almost no compression for building locally, and loading a single file into Firefox on the same machine, or highly compressed file for uploading to file hosting).

Only Firefox archives are supported right now.
