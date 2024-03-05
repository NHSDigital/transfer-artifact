# Transfer-Artifact v4

This uploads and downloads artifacts from your workflow to S3, allowing you to share data between jobs and store data once a workflow is complete.

This is based on [this fork](https://github.com/diroussel/upload-artifact/tree/s3) from the original Github action.
See also the original actions, [upload-artifact](https://github.com/actions/upload-artifact) and [download-artifact](https://github.com/actions/download-artifact).

# Usage

See [action.yml](action.yml)

### Upload an Individual File

```yaml
steps:
- uses: actions/checkout@v3

- run: mkdir -p path/to/artifact

- run: echo hello > path/to/artifact/world.txt

- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: path/to/artifact/world.txt
```

### Upload an Entire Directory

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: path/to/artifact/ # or path/to/artifact
```

### Upload using a Wildcard Pattern

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: path/**/[abc]rtifac?/*
```

### Upload using Multiple Paths and Exclusions

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: |
      path/output/bin/
      path/output/test-results
      !path/**/*.tmp
```

For supported wildcards along with behavior and documentation, see [@actions/glob](https://github.com/actions/toolkit/tree/main/packages/glob) which is used internally to search for files.

If a wildcard pattern is used, the path hierarchy will be preserved after the first wildcard pattern:

```
path/to/*/directory/foo?.txt =>
    ∟ path/to/some/directory/foo1.txt
    ∟ path/to/some/directory/foo2.txt
    ∟ path/to/other/directory/foo1.txt

would be flattened and uploaded as =>
    ∟ some/directory/foo1.txt
    ∟ some/directory/foo2.txt
    ∟ other/directory/foo1.txt
```

If multiple paths are provided as input, the least common ancestor of all the search paths will be used as the root directory of the artifact. Exclude paths do not affect the directory structure.

Relative and absolute file paths are both allowed. Relative paths are rooted against the current working directory. Paths that begin with a wildcard character should be quoted to avoid being interpreted as YAML aliases.

The [@actions/artifact](https://github.com/actions/toolkit/tree/main/packages/artifact) package is used internally to handle most of the logic around uploading an artifact. There is extra documentation around upload limitations and behavior in the toolkit repo that is worth checking out.

### Customization if no files are found

If a path (or paths), result in no files being found for the artifact, the action will succeed but print out a warning. In certain scenarios it may be desirable to fail the action or suppress the warning. The `if-no-files-found` option allows you to customize the behavior of the action if no files are found:

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: path/to/artifact/
    if-no-files-found: error # 'warn' or 'ignore' are also available, defaults to `warn`
```

### Conditional Artifact Upload

To upload artifacts only when the previous step of a job failed, use [`if: failure()`](https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions#job-status-check-functions):

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  if: failure()
  with:
    folder-name: my-folder
    name: my-artifact
    direction: 'upload'
    path: path/to/artifact/
```

### Uploading without an artifact name

You can upload an artifact without specifying a name

```yaml
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    direction: 'upload'
    path: path/to/artifact/world.txt
```

If not provided, `artifact` will be used as the default name for the artifact, `upload-artifacts` will be the default name for the folder, and `upload` will be the direction of travel.

### Uploading to the same artifact

With the following example, the available artifact (named `artifact` by default if no name is provided) would contain both `world.txt` (`hello`) and `extra-file.txt` (`howdy`):

```yaml
- run: echo hi > world.txt
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    path: world.txt
    direction: 'upload'

- run: echo howdy > extra-file.txt
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    path: extra-file.txt
    direction: 'upload'

- run: echo hello > world.txt
- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    path: world.txt
    direction: 'upload'
```

Each artifact behaves as a file share. Uploading to the same artifact multiple times in the same workflow can overwrite and append already uploaded files:

```yaml
    strategy:
      matrix:
          node-version: [8.x, 10.x, 12.x, 13.x]
    steps:
        - name: Create a file
          run: echo ${{ github.run_number }} > my_file.txt
        - name: Accidentally upload to the same artifact via multiple jobs
          uses: NHSDigital/CAAS-transfer-artifact@s3
          env:
            bucket: abcd-123456789-eu-west-2-my-S3-bucket
          with:
              folder-name: my-folder
              name: my-artifact
              direction: 'upload'
              path: ${{ github.workspace }}
```

> **_Warning:_** Be careful when uploading to the same artifact via multiple jobs as artifacts may become corrupted. When uploading a file with an identical name and path in multiple jobs, uploads may fail with 503 errors due to conflicting uploads happening at the same time. Ensure uploads to identical locations to not interfere with each other.

In the above example, four jobs will upload four different files to the same artifact but there will only be one file available when `my-artifact` is downloaded. Each job overwrites what was previously uploaded. To ensure that jobs don't overwrite existing artifacts, use a different name per job:

```yaml
          uses: NHSDigital/CAAS-transfer-artifact@s3
          env:
            bucket: abcd-123456789-eu-west-2-my-S3-bucket
          with:
              folder-name: my-folder
              name: my-artifact-${{ github.run_number }}
              direction: 'upload'
              path: ${{ github.workspace }}
```

### Environment Variables and Tilde Expansion

You can use `~` in the path input as a substitute for `$HOME`. Basic tilde expansion is supported:

```yaml
  - run: |
      mkdir -p ~/new/artifact
      echo hello > ~/new/artifact/world.txt
  - uses: NHSDigital/CAAS-transfer-artifact@s3
    env:
      bucket: abcd-123456789-eu-west-2-my-S3-bucket
    with:
      folder-name: my-folder
      name: Artifacts-V3
      path: ~/new/**/*
      direction: 'upload'
```

Environment variables along with context expressions can also be used for input. For documentation see [context and expression syntax](https://help.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions):

```yaml
    env:
      name: my-artifact
    steps:
    - run: |
        mkdir -p ${{ github.workspace }}/artifact
        echo hello > ${{ github.workspace }}/artifact/world.txt
    - uses: NHSDigital/CAAS-transfer-artifact@s3
      env:
        bucket: abcd-123456789-eu-west-2-my-S3-bucket
      with:
        folder-name: my-folder
        name: ${{ env.name }}-name
        path: ${{ github.workspace }}/artifact/**/*#
        direction: 'upload'
```

For environment variables created in other steps, make sure to use the `env` expression syntax

```yaml
    steps:
    - run: | 
        mkdir testing
        echo "This is a file to upload" > testing/file.txt
        echo "artifactPath=testing/file.txt" >> $GITHUB_ENV
    - uses: NHSDigital/CAAS-transfer-artifact@s3
      env:
        bucket: abcd-123456789-eu-west-2-my-S3-bucket
      with:
        folder-name: my-folder
        name: artifact
        path: ${{ env.artifactPath }} # this will resolve to testing/file.txt at runtime
        direction: 'upload'
```

### Retention Period

Artifacts are retained for 90 days by default. You can specify a shorter retention period using the `retention-days` input:

```yaml
  - name: Create a file
    run: echo "I won't live long" > my_file.txt

  - name: Upload Artifact
    uses: NHSDigital/CAAS-transfer-artifact@s3
    env:
      bucket: abcd-123456789-eu-west-2-my-S3-bucket
    with:
      folder-name: my-folder
      name: my-artifact
      path: my_file.txt
      retention-days: 5
      direction: 'upload'
```

The retention period must be between 1 and 90 inclusive. For more information see [artifact and log retention policies](https://docs.github.com/en/free-pro-team@latest/actions/reference/usage-limits-billing-and-administration#artifact-and-log-retention-policy).

## Where does the upload go?

Artifacts are uploaded to the specified S3 bucket, into a folder called `folder-name`

### Downloading all files

```yaml
steps:
- uses: actions/checkout@v3

- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact/path/to/artifact
    direction: 'download'
```
This will download every object in the S3 bucket which matches the `my-folder/my-artifact/path/to/artifact` name prefix. 

### Downloading one file

```yaml
steps:
- uses: actions/checkout@v3

- uses: NHSDigital/CAAS-transfer-artifact@s3
  env:
    bucket: abcd-123456789-eu-west-2-my-S3-bucket
  with:
    folder-name: my-folder
    name: my-artifact/path/to/artifact/word.txt
    direction: 'download'
```
This will download only the file `my-artifact/path/to/artifact/word.txt`
