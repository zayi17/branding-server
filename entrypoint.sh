#!/bin/sh
# In entrypoint.sh

CONFIG_PATH="/usr/local/apache2/htdocs/config.js"

# Convert the OIDC_ENABLED variable to lowercase for a case-insensitive check.
OIDC_ENABLED_LOWER=$(echo "${OIDC_ENABLED}" | tr '[:upper:]' '[:lower:]')

# Create the config.js file using the corrected check.
echo "window.API_BASE_URL = '${API_URL}';" > ${CONFIG_PATH}
echo "window.OIDC_ENABLED = '${OIDC_ENABLED_LOWER}' === 'true';" >> ${CONFIG_PATH}
echo "window.OIDC_URL = '${OIDC_URL}';" >> ${CONFIG_PATH}
echo "window.OIDC_REALM = '${OIDC_REALM}';" >> ${CONFIG_PATH}
echo "window.OIDC_CLIENT_ID = '${OIDC_CLIENT_ID}';" >> ${CONFIG_PATH}

echo "Generated Corrected config.js"

# Start the web server
exec "$@"